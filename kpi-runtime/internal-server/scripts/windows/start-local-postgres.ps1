param()

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'resolve-postgres-tools.ps1')

$postgresBinDir = Resolve-KpiPostgresBinDir -ServerDir $serverDir -RequiredExecutable 'pg_ctl.exe' -InstallIfMissing
$pgCtlPath = Join-Path $postgresBinDir 'pg_ctl.exe'
$pgIsReadyPath = Join-Path $postgresBinDir 'pg_isready.exe'
$postgresDataDir = Join-Path $serverDir 'var\central-runtime\postgres\data'
$postgresLogFile = Join-Path $serverDir 'var\central-runtime\postgres\logs\postgres.log'
$postgresPort = 5400

function Test-PostgresReady {
  & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

if (-not (Test-Path (Join-Path $postgresDataDir 'PG_VERSION'))) {
  throw "Local KPI PostgreSQL cluster is not initialized. Run initialize-central-runtime.ps1 first."
}

& $pgCtlPath -D $postgresDataDir status 2>$null | Out-Null
if ($LASTEXITCODE -eq 0 -or (Test-PostgresReady)) {
  Write-Host "Local KPI PostgreSQL is already running on port $postgresPort."
  exit 0
}

& $pgCtlPath -D $postgresDataDir -l $postgresLogFile -o "-p $postgresPort" start | Out-Null
$startExitCode = $LASTEXITCODE
if ($startExitCode -ne 0 -and (Test-PostgresReady)) {
  Write-Warning "pg_ctl start returned exit code $startExitCode, but PostgreSQL is already accepting connections on port $postgresPort."
  exit 0
}

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
  & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Local KPI PostgreSQL started on port $postgresPort."
    exit 0
  }
  Start-Sleep -Milliseconds 500
}

throw "Local KPI PostgreSQL did not become ready in time."
