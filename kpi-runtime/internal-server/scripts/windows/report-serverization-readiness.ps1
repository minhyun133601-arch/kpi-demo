param(
  [string]$BaseUrl = 'http://127.0.0.1:3104',
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $serverDir 'var\logs'
$reportDir = Join-Path $logDir 'readiness'
$baseRoot = $BaseUrl.TrimEnd('/')

function Convert-ToAbsolutePath {
  param(
    [string]$BaseDir,
    [string]$PathValue
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return [System.IO.Path]::GetFullPath((Join-Path $BaseDir 'var'))
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BaseDir $PathValue))
}

function Get-ConfiguredStorageRoot {
  param([string]$ServerDir)

  $candidatePaths = @()
  if ($env:KPI_ENV_FILE) {
    $candidatePaths += if ([System.IO.Path]::IsPathRooted($env:KPI_ENV_FILE)) {
      $env:KPI_ENV_FILE
    } else {
      Join-Path $ServerDir $env:KPI_ENV_FILE
    }
  }
  $candidatePaths += @(
    (Join-Path $ServerDir '.env.production.local'),
    (Join-Path $ServerDir '.env.development.local'),
    (Join-Path $ServerDir '.env')
  )

  foreach ($candidatePath in @($candidatePaths | Select-Object -Unique)) {
    if (-not (Test-Path $candidatePath)) {
      continue
    }

    foreach ($line in Get-Content -Path $candidatePath -Encoding utf8) {
      $trimmed = ([string]$line).Trim()
      if (-not $trimmed -or $trimmed.StartsWith('#')) {
        continue
      }
      if (-not $trimmed.StartsWith('KPI_STORAGE_ROOT=')) {
        continue
      }

      $value = $trimmed.Substring('KPI_STORAGE_ROOT='.Length).Trim().Trim('"')
      return Convert-ToAbsolutePath -BaseDir $ServerDir -PathValue $value
    }
  }

  return Convert-ToAbsolutePath -BaseDir $ServerDir -PathValue 'var'
}

function Invoke-JsonWebRequest {
  param([string]$Url)

  try {
    $payload = Invoke-RestMethod -Uri $Url -TimeoutSec 10
    return [ordered]@{
      ok = $true
      url = $Url
      data = $payload
    }
  } catch {
    return [ordered]@{
      ok = $false
      url = $Url
      error = $_.Exception.Message
    }
  }
}

function Invoke-ExternalJsonCommand {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory
  )

  try {
    Push-Location $WorkingDirectory
    try {
      $raw = & $FilePath @ArgumentList 2>&1 | Out-String
      $exitCode = $LASTEXITCODE
    } finally {
      Pop-Location
    }
  } catch {
    return [ordered]@{
      ok = $false
      exitCode = -1
      raw = $_.Exception.Message
      parsed = $null
    }
  }

  $text = $raw.Trim()
  $parsed = $null
  if ($text) {
    try {
      $parsed = $text | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $parsed = $null
    }
  }

  [ordered]@{
    ok = $exitCode -eq 0
    exitCode = $exitCode
    raw = $text
    parsed = $parsed
  }
}

function Invoke-PowershellJsonScript {
  param(
    [string]$ScriptPath,
    [string[]]$ArgumentList = @()
  )

  try {
    $raw = & powershell -ExecutionPolicy Bypass -File $ScriptPath @ArgumentList 2>&1 | Out-String
    $text = $raw.Trim()
    $parsed = $null
    if ($text) {
      try {
        $parsed = $text | ConvertFrom-Json -ErrorAction Stop
      } catch {
        $parsed = $null
      }
    }

    [ordered]@{
      ok = $true
      raw = $text
      parsed = $parsed
    }
  } catch {
    [ordered]@{
      ok = $false
      raw = $_.Exception.Message
      parsed = $null
    }
  }
}

function Get-PathSummary {
  param([string]$TargetPath)

  $exists = Test-Path $TargetPath
  if (-not $exists) {
    return [ordered]@{
      path = $TargetPath
      exists = $false
    }
  }

  $item = Get-Item $TargetPath
  [ordered]@{
    path = $TargetPath
    exists = $true
    type = if ($item.PSIsContainer) { 'directory' } else { 'file' }
    lastWriteTime = $item.LastWriteTime.ToString('o')
    length = if ($item.PSIsContainer) { $null } else { $item.Length }
  }
}

function Get-LatestChildSummary {
  param(
    [string]$Root,
    [string]$ChildType
  )

  if (-not (Test-Path $Root)) {
    return [ordered]@{
      root = $Root
      exists = $false
      latest = $null
    }
  }

  $children = if ($ChildType -eq 'file') {
    @(Get-ChildItem -Path $Root -File -ErrorAction SilentlyContinue)
  } else {
    @(Get-ChildItem -Path $Root -Directory -ErrorAction SilentlyContinue)
  }
  $children = @($children | Where-Object { $_.Name -ne '.gitkeep' } | Sort-Object LastWriteTime -Descending)

  [ordered]@{
    root = $Root
    exists = $true
    count = $children.Count
    latest = if ($children.Count -gt 0) {
      [ordered]@{
        path = $children[0].FullName
        lastWriteTime = $children[0].LastWriteTime.ToString('o')
      }
    } else {
      $null
    }
  }
}

$stdoutLog = Join-Path $logDir 'server.stdout.log'
$stderrLog = Join-Path $logDir 'server.stderr.log'
$storageRoot = Get-ConfiguredStorageRoot -ServerDir $serverDir
$runtimeBackupRoot = Join-Path $storageRoot 'backups\runtime-snapshots'
$fileBackupRoot = Join-Path $storageRoot 'backups\file-storage'

$health = Invoke-JsonWebRequest -Url ($baseRoot + '/api/health')
$bootstrap = Invoke-JsonWebRequest -Url ($baseRoot + '/api/bootstrap/status')
$smoke = Invoke-ExternalJsonCommand -FilePath 'node' -ArgumentList @('src/scripts/verifyKpiRootStatic.js') -WorkingDirectory $serverDir
$runtimeRestorePlan = Invoke-ExternalJsonCommand -FilePath 'node' -ArgumentList @('src/scripts/restoreRuntimeSnapshot.js', '--plan') -WorkingDirectory $serverDir
$retentionPreview = Invoke-PowershellJsonScript -ScriptPath (Join-Path $PSScriptRoot 'backup-retention.ps1')
$fileRestorePreview = Invoke-PowershellJsonScript -ScriptPath (Join-Path $PSScriptRoot 'restore-file-storage.ps1')

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$defaultOutput = Join-Path $reportDir ("serverization-readiness-$timestamp.json")
$latestOutput = Join-Path $reportDir 'serverization-readiness-latest.json'
$targetOutput = if ($OutputPath) {
  if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
  } else {
    Join-Path $serverDir $OutputPath
  }
} else {
  $defaultOutput
}

$report = [ordered]@{
  ok = $health.ok -and $smoke.ok
  generatedAt = (Get-Date).ToString('o')
  baseUrl = $baseRoot + '/'
  currentManualGates = @(
    'S2-1 waiting_external_pilot_evidence',
    'S2-2 waiting_real_user_pc_residue_check'
  )
  runtime = [ordered]@{
    health = $health
    bootstrap = $bootstrap
    smoke = $smoke.parsed
  }
  paths = [ordered]@{
    serverRoot = $serverDir
    stdoutLog = Get-PathSummary -TargetPath $stdoutLog
    stderrLog = Get-PathSummary -TargetPath $stderrLog
    runtimeBackups = Get-LatestChildSummary -Root $runtimeBackupRoot -ChildType 'file'
    fileStorageBackups = Get-LatestChildSummary -Root $fileBackupRoot -ChildType 'directory'
  }
  operations = [ordered]@{
    retentionPreview = $retentionPreview.parsed
    fileRestorePreview = $fileRestorePreview.parsed
    runtimeRestorePlan = $runtimeRestorePlan.parsed
  }
  commands = [ordered]@{
    startServer = 'kpi-runtime/internal-server/scripts/windows/start-server.ps1'
    stopServer = 'kpi-runtime/internal-server/scripts/windows/stop-server.ps1'
    smokeRoot = 'kpi-runtime/internal-server/scripts/windows/check-kpi-root.ps1'
    backupAll = 'kpi-runtime/internal-server/scripts/windows/backup-all.ps1'
    backupRetentionPreview = 'kpi-runtime/internal-server/scripts/windows/backup-retention.ps1'
    fileRestorePreview = 'kpi-runtime/internal-server/scripts/windows/restore-file-storage.ps1'
    recoveryRehearsal = 'kpi-runtime/internal-server/scripts/windows/rehearse-runtime-recovery.ps1'
    readinessReport = 'kpi-runtime/internal-server/scripts/windows/report-serverization-readiness.ps1'
  }
}

$json = $report | ConvertTo-Json -Depth 10
Set-Content -Path $targetOutput -Value $json -Encoding UTF8
Set-Content -Path $latestOutput -Value $json -Encoding UTF8

$report['reportPath'] = $targetOutput
$report['latestPath'] = $latestOutput
$report | ConvertTo-Json -Depth 10
