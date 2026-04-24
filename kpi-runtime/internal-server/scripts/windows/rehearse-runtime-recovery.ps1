param(
  [string]$BaseUrl = 'http://127.0.0.1:3100',
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $serverDir 'var\logs'
$reportDir = Join-Path $logDir 'readiness'
$baseRoot = $BaseUrl.TrimEnd('/')

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

$health = Invoke-JsonWebRequest -Url ($baseRoot + '/api/health')
$bootstrap = Invoke-JsonWebRequest -Url ($baseRoot + '/api/bootstrap/status')
$backupSummary = Invoke-PowershellJsonScript -ScriptPath (Join-Path $PSScriptRoot 'backup-all.ps1')

$runtimeSnapshotPath = $backupSummary.parsed.runtimeSnapshot.snapshotPath
$fileBackupRoot = $backupSummary.parsed.fileStorage.backupRoot

if (-not $backupSummary.ok -or -not $backupSummary.parsed.ok -or [string]::IsNullOrWhiteSpace($runtimeSnapshotPath) -or [string]::IsNullOrWhiteSpace($fileBackupRoot)) {
  throw 'runtime_rehearsal_backup_failed'
}

$runtimeRestoreDryRun = Invoke-ExternalJsonCommand -FilePath 'node' -ArgumentList @(
  'src/scripts/restoreRuntimeSnapshot.js',
  "--snapshot=$runtimeSnapshotPath",
  '--dry-run'
) -WorkingDirectory $serverDir
$fileRestorePreview = Invoke-PowershellJsonScript -ScriptPath (Join-Path $PSScriptRoot 'restore-file-storage.ps1') -ArgumentList @(
  "-BackupPath=$fileBackupRoot"
)

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$defaultOutput = Join-Path $reportDir ("runtime-recovery-rehearsal-$timestamp.json")
$latestOutput = Join-Path $reportDir 'runtime-recovery-rehearsal-latest.json'
$targetOutput = if ($OutputPath) {
  if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath
  } else {
    Join-Path $serverDir $OutputPath
  }
} else {
  $defaultOutput
}

$reportPath = $targetOutput
$latestPath = $latestOutput

$report = [ordered]@{
  ok = (
    $health.ok -and
    $bootstrap.ok -and
    $backupSummary.ok -and
    $backupSummary.parsed.ok -and
    $runtimeRestoreDryRun.ok -and
    $runtimeRestoreDryRun.parsed.ok -and
    $fileRestorePreview.ok -and
    $fileRestorePreview.parsed.ok
  )
  generatedAt = (Get-Date).ToString('o')
  baseUrl = $baseRoot + '/'
  runtime = [ordered]@{
    health = $health
    bootstrap = $bootstrap
  }
  operations = [ordered]@{
    backupAll = $backupSummary.parsed
    runtimeRestoreDryRun = $runtimeRestoreDryRun.parsed
    fileRestorePreview = $fileRestorePreview.parsed
  }
  commands = [ordered]@{
    rehearsal = 'kpi-runtime/internal-server/scripts/windows/rehearse-runtime-recovery.ps1'
    backupAll = 'kpi-runtime/internal-server/scripts/windows/backup-all.ps1'
    runtimeRestoreDryRun = "node src/scripts/restoreRuntimeSnapshot.js --snapshot=$runtimeSnapshotPath --dry-run"
    fileRestorePreview = "kpi-runtime/internal-server/scripts/windows/restore-file-storage.ps1 -BackupPath=$fileBackupRoot"
  }
  reportPath = $reportPath
  latestPath = $latestPath
}

$json = $report | ConvertTo-Json -Depth 10
Set-Content -Path $targetOutput -Value $json -Encoding UTF8
Set-Content -Path $latestOutput -Value $json -Encoding UTF8
$report | ConvertTo-Json -Depth 10
