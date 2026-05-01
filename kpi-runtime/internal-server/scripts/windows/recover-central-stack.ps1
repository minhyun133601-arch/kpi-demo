param(
  [switch]$SkipServerRestart
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'resolve-postgres-tools.ps1')

$postgresBinDir = Resolve-KpiPostgresBinDir -ServerDir $serverDir -RequiredExecutable 'pg_isready.exe'
$pgIsReadyPath = Join-Path $postgresBinDir 'pg_isready.exe'
$postgresPort = 5400
$envFilePath = Join-Path $serverDir '.env.production.local'
$postgresDataDir = Join-Path $serverDir 'var\central-runtime\postgres\data'
$postmasterPidPath = Join-Path $postgresDataDir 'postmaster.pid'
$initializeScriptPath = Join-Path $PSScriptRoot 'initialize-central-runtime.ps1'
$startServerScriptPath = Join-Path $PSScriptRoot 'start-server.prod.ps1'
$stopServerScriptPath = Join-Path $PSScriptRoot 'stop-server.ps1'
$stopPostgresScriptPath = Join-Path $PSScriptRoot 'stop-local-postgres.ps1'

function Read-ServerPort {
  param([string]$FilePath)

  if (-not (Test-Path $FilePath)) {
    return 3104
  }

  foreach ($line in Get-Content -Path $FilePath -Encoding utf8) {
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }
    if (-not $trimmed.StartsWith('KPI_SERVER_PORT=')) {
      continue
    }

    $value = $trimmed.Substring('KPI_SERVER_PORT='.Length).Trim().Trim('"')
    $parsedPort = 0
    if ([int]::TryParse($value, [ref]$parsedPort) -and $parsedPort -gt 0) {
      return $parsedPort
    }
  }

  return 3104
}

function Test-PostgresReady {
  if (-not (Test-Path $pgIsReadyPath)) {
    return $false
  }

  & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

function Test-PostgresPortListening {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $postgresPort -ErrorAction SilentlyContinue
  return ($null -ne $listener)
}

function Wait-ForHttpEndpoint {
  param(
    [string]$Uri,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec 5 | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "HTTP endpoint did not become ready in time: $Uri"
}

function Remove-StalePostmasterPidFile {
  if (-not (Test-Path $postmasterPidPath)) {
    Write-Host 'No postmaster.pid file was found.'
    return $false
  }

  if (Test-PostgresPortListening) {
    throw "PostgreSQL port $postgresPort is still listening. Recovery will not remove postmaster.pid automatically."
  }

  $pidValue = $null
  foreach ($line in Get-Content -Path $postmasterPidPath -Encoding ascii) {
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed) {
      continue
    }
    $parsedPid = 0
    if ([int]::TryParse($trimmed, [ref]$parsedPid) -and $parsedPid -gt 0) {
      $pidValue = $parsedPid
    }
    break
  }

  if ($pidValue) {
    $postmasterProcess = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($postmasterProcess) {
      throw "postmaster.pid points to active PID $pidValue. Recovery will not remove it automatically."
    }
  }

  Remove-Item -LiteralPath $postmasterPidPath -Force
  Write-Host 'Removed stale postmaster.pid file.'
  return $true
}

$serverPort = Read-ServerPort -FilePath $envFilePath
$healthUrl = "http://127.0.0.1:$serverPort/api/health"
$loginUrl = "http://127.0.0.1:$serverPort/login"

Write-Host 'Stopping KPI demo runtime if it is running...'
& $stopServerScriptPath -Environment Production

Write-Host 'Stopping local KPI PostgreSQL if it is running...'
& $stopPostgresScriptPath

Start-Sleep -Seconds 2

if (Test-PostgresReady) {
  throw "PostgreSQL is still accepting connections on port $postgresPort after stop. Manual inspection is required."
}

$removedPid = Remove-StalePostmasterPidFile

Write-Host 'Initializing PostgreSQL runtime and environment...'
& $initializeScriptPath

if ($SkipServerRestart) {
  Write-Host 'Recovery runtime reset completed. Server restart was skipped.'
} else {
  Write-Host 'Starting KPI demo runtime again...'
  & $startServerScriptPath -ForceRestart
  Wait-ForHttpEndpoint -Uri $healthUrl

  Write-Host 'Recovery completed.'
  Write-Host "Health: $healthUrl"
  Write-Host "Login: $loginUrl"
}
if ($removedPid) {
  Write-Host 'A stale postmaster.pid file was cleaned during recovery.'
}
