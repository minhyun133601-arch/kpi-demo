param()

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'resolve-postgres-tools.ps1')

$postgresBinDir = Resolve-KpiPostgresBinDir -ServerDir $serverDir -RequiredExecutable 'pg_ctl.exe'
$pgCtlPath = Join-Path $postgresBinDir 'pg_ctl.exe'
$pgIsReadyPath = Join-Path $postgresBinDir 'pg_isready.exe'
$postgresDataDir = Join-Path $serverDir 'var\central-runtime\postgres\data'
$postgresPort = 5434

function Assert-CommandPath {
  param([string]$PathToCheck)

  if (-not (Test-Path $PathToCheck)) {
    throw "Required command was not found: $PathToCheck"
  }
}

function Test-PostgresReady {
  & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

function Test-PostgresListening {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $postgresPort -ErrorAction SilentlyContinue
  return ($null -ne $listener)
}

function Get-PostgresRuntimeState {
  & $pgCtlPath -D $postgresDataDir status 2>$null | Out-Null
  $statusExitCode = $LASTEXITCODE
  $isReady = Test-PostgresReady
  $isListening = Test-PostgresListening

  return [pscustomobject]@{
    pgCtlReportsRunning = ($statusExitCode -eq 0)
    isReady = $isReady
    isListening = $isListening
    isRunning = ($statusExitCode -eq 0 -or $isReady -or $isListening)
    statusExitCode = $statusExitCode
  }
}

function Wait-ForPostgresStopped {
  param([int]$TimeoutSeconds = 20)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $state = Get-PostgresRuntimeState
    if (-not $state.isRunning) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "Local KPI PostgreSQL did not stop cleanly on port $postgresPort."
}

Assert-CommandPath -PathToCheck $pgCtlPath
Assert-CommandPath -PathToCheck $pgIsReadyPath

if (-not (Test-Path (Join-Path $postgresDataDir 'PG_VERSION'))) {
  Write-Host "Local KPI PostgreSQL cluster was not initialized."
  exit 0
}

$runtimeState = Get-PostgresRuntimeState
if (-not $runtimeState.isRunning) {
  Write-Host "Local KPI PostgreSQL is already stopped."
  exit 0
}

if (-not $runtimeState.pgCtlReportsRunning) {
  Write-Warning "pg_ctl status did not report PostgreSQL as running, but the server is still reachable on port $postgresPort. Attempting a clean stop."
}

& $pgCtlPath -D $postgresDataDir stop -m fast | Out-Null
$stopExitCode = $LASTEXITCODE
if ($stopExitCode -ne 0) {
  try {
    Wait-ForPostgresStopped -TimeoutSeconds 10
    Write-Warning "pg_ctl stop returned exit code $stopExitCode, but PostgreSQL finished stopping on port $postgresPort."
    exit 0
  } catch {
    throw "Local KPI PostgreSQL stop failed on port $postgresPort (pg_ctl exit code $stopExitCode)."
  }
}

Wait-ForPostgresStopped
Write-Host "Stopped local KPI PostgreSQL."
