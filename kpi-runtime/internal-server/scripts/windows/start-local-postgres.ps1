param()

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'resolve-postgres-tools.ps1')

$postgresBinDir = Resolve-KpiPostgresBinDir -ServerDir $serverDir -RequiredExecutable 'pg_ctl.exe'
$pgCtlPath = Join-Path $postgresBinDir 'pg_ctl.exe'
$pgIsReadyPath = Join-Path $postgresBinDir 'pg_isready.exe'
$postgresPath = Join-Path $postgresBinDir 'postgres.exe'
$postgresDataDir = Join-Path $serverDir 'var\central-runtime\postgres\data'
$postgresLogDir = Join-Path $serverDir 'var\central-runtime\postgres\logs'
$postgresStdoutLogFile = Join-Path $postgresLogDir 'postgres.stdout.log'
$postgresStderrLogFile = Join-Path $postgresLogDir 'postgres.stderr.log'
$postgresPort = 5400

function Test-PostgresReady {
  & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

if (-not (Test-Path (Join-Path $postgresDataDir 'PG_VERSION'))) {
  throw "Local KPI PostgreSQL cluster is not initialized. Run initialize-central-runtime.ps1 first."
}

if (-not (Test-Path $postgresPath)) {
  throw "Required command was not found: $postgresPath"
}

New-Item -ItemType Directory -Force -Path $postgresLogDir | Out-Null

& $pgCtlPath -D $postgresDataDir status 2>$null | Out-Null
if ($LASTEXITCODE -eq 0 -or (Test-PostgresReady)) {
  Write-Host "Local KPI PostgreSQL is already running on port $postgresPort."
  exit 0
}

$startProcess = Start-Process `
  -FilePath $postgresPath `
  -ArgumentList @('-D', $postgresDataDir, '-p', [string]$postgresPort) `
  -PassThru `
  -WindowStyle Hidden `
  -RedirectStandardOutput $postgresStdoutLogFile `
  -RedirectStandardError $postgresStderrLogFile

Start-Sleep -Milliseconds 500
if ($startProcess.HasExited -and -not (Test-PostgresReady)) {
  throw "Local KPI PostgreSQL process exited during startup (exit code $($startProcess.ExitCode))."
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
