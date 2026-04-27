param(
  [switch]$StartServer,
  [switch]$BootstrapOwner,
  [switch]$ForceRewriteEnv
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$varDir = Join-Path $serverDir 'var'
$centralDir = Join-Path $varDir 'central-runtime'
$postgresDir = Join-Path $centralDir 'postgres'
$postgresDataDir = Join-Path $postgresDir 'data'
$postgresLogDir = Join-Path $postgresDir 'logs'
$secretsDir = Join-Path $centralDir 'secrets'
$cloudflaredDir = Join-Path $centralDir 'cloudflared'
$toolsDir = Join-Path $centralDir 'tools'
$prodStorageDir = Join-Path $varDir 'prod'
$envFilePath = Join-Path $serverDir '.env.production.local'

. (Join-Path $PSScriptRoot 'resolve-postgres-tools.ps1')

$postgresBinDir = Resolve-KpiPostgresBinDir -ServerDir $serverDir -RequiredExecutable 'initdb.exe' -InstallIfMissing
$initdbPath = Join-Path $postgresBinDir 'initdb.exe'
$pgCtlPath = Join-Path $postgresBinDir 'pg_ctl.exe'
$pgIsReadyPath = Join-Path $postgresBinDir 'pg_isready.exe'
$psqlPath = Join-Path $postgresBinDir 'psql.exe'

$postgresPort = 5400
$postgresSuperuser = 'postgres'
$appDatabase = 'kpi_internal'
$appUser = 'kpi_app'
$ownerUsername = '1234'
$ownerDisplayName = 'Demo User'

function Assert-CommandPath {
  param([string]$PathToCheck)
  if (-not (Test-Path $PathToCheck)) {
    throw "Required command was not found: $PathToCheck"
  }
}

function New-SecretValue {
  param([int]$Bytes = 24)
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($buffer).Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

function Get-OrCreateSecret {
  param(
    [string]$Name,
    [int]$Bytes = 24
  )

  $path = Join-Path $secretsDir $Name
  if (Test-Path $path) {
    return (Get-Content -Path $path -Raw -Encoding utf8).Trim()
  }

  $value = New-SecretValue -Bytes $Bytes
  Set-Content -Path $path -Value $value -Encoding ascii -NoNewline
  return $value
}

function Wait-ForPostgres {
  param([int]$TimeoutSeconds = 20)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $result = & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null
    if ($LASTEXITCODE -eq 0) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "PostgreSQL on port $postgresPort did not become ready in time."
}

function Test-PostgresReady {
  & $pgIsReadyPath -h 127.0.0.1 -p $postgresPort 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-PostgresStarted {
  & $pgCtlPath -D $postgresDataDir status 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    return
  }

  if (Test-PostgresReady) {
    Write-Warning "PostgreSQL is already accepting connections on port $postgresPort even though pg_ctl status did not report it as running."
    return
  }

  & $pgCtlPath -D $postgresDataDir -l $postgresLogFile -o "-p $postgresPort" start | Out-Null
  $startExitCode = $LASTEXITCODE
  if ($startExitCode -eq 0) {
    return
  }

  try {
    Wait-ForPostgres -TimeoutSeconds 10
    Write-Warning "pg_ctl start returned exit code $startExitCode, but PostgreSQL became ready on port $postgresPort."
  } catch {
    throw "Local KPI PostgreSQL failed to start cleanly on port $postgresPort (pg_ctl exit code $startExitCode)."
  }
}

function Wait-ForHttpEndpoint {
  param(
    [string]$Uri,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod -Uri $Uri -Method Get | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "HTTP endpoint did not become ready in time: $Uri"
}

function Invoke-Psql {
  param(
    [string]$Database,
    [string]$Sql
  )

  $env:PGPASSWORD = $postgresPassword
  try {
    & $psqlPath `
      -v ON_ERROR_STOP=1 `
      -h 127.0.0.1 `
      -p $postgresPort `
      -U $postgresSuperuser `
      -d $Database `
      -tAc $Sql
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

function Convert-PsqlScalar {
  param([object]$Value)

  if ($null -eq $Value) {
    return ''
  }

  return (($Value | Out-String).Trim())
}

Assert-CommandPath -PathToCheck $initdbPath
Assert-CommandPath -PathToCheck $pgCtlPath
Assert-CommandPath -PathToCheck $pgIsReadyPath
Assert-CommandPath -PathToCheck $psqlPath

New-Item -ItemType Directory -Force -Path $varDir, $centralDir, $postgresDir, $postgresLogDir, $secretsDir, $cloudflaredDir, $toolsDir, $prodStorageDir | Out-Null

$postgresPassword = Get-OrCreateSecret -Name 'postgres-superuser.password'
$appPassword = Get-OrCreateSecret -Name 'kpi-app.password'
$cookieSecret = Get-OrCreateSecret -Name 'kpi-cookie-secret'

if (-not (Test-Path (Join-Path $postgresDataDir 'PG_VERSION'))) {
  $tempPasswordFile = Join-Path $secretsDir 'postgres-init.password'
  Set-Content -Path $tempPasswordFile -Value $postgresPassword -Encoding ascii -NoNewline
  try {
    & $initdbPath `
      -D $postgresDataDir `
      -U $postgresSuperuser `
      --pwfile=$tempPasswordFile `
      --auth-local=scram-sha-256 `
      --auth-host=scram-sha-256 `
      --encoding=UTF8
  } finally {
    Remove-Item -Path $tempPasswordFile -ErrorAction SilentlyContinue
  }
}

$postgresLogFile = Join-Path $postgresLogDir 'postgres.log'
Ensure-PostgresStarted

Wait-ForPostgres

$escapedAppPassword = $appPassword.Replace("'", "''")
$roleExists = Convert-PsqlScalar (Invoke-Psql -Database 'postgres' -Sql "select 1 from pg_roles where rolname = '$appUser';")
if ($roleExists -ne '1') {
  Invoke-Psql -Database 'postgres' -Sql "create role $appUser login password '$escapedAppPassword';" | Out-Null
} else {
  Invoke-Psql -Database 'postgres' -Sql "alter role $appUser with login password '$escapedAppPassword';" | Out-Null
}

$dbExists = Convert-PsqlScalar (Invoke-Psql -Database 'postgres' -Sql "select 1 from pg_database where datname = '$appDatabase';")
if ($dbExists -ne '1') {
  Invoke-Psql -Database 'postgres' -Sql "create database $appDatabase owner $appUser;" | Out-Null
}

$envContent = @"
# Current-PC central runtime
KPI_SERVER_HOST=0.0.0.0
KPI_SERVER_PORT=3104
KPI_DATABASE_URL=postgresql://${appUser}:${appPassword}@127.0.0.1:${postgresPort}/${appDatabase}
KPI_AUTH_ENABLED=true
KPI_LOGIN_ENABLED=true
KPI_COOKIE_SECRET=${cookieSecret}
KPI_SESSION_TTL_HOURS=12
KPI_SESSION_PRUNE_INTERVAL_MINUTES=30
KPI_STORAGE_ROOT=./var/prod
KPI_AUTO_MIGRATE=true
"@

if ($ForceRewriteEnv -or -not (Test-Path $envFilePath)) {
  Set-Content -Path $envFilePath -Value $envContent -Encoding ascii
}

if ($StartServer) {
  & (Join-Path $PSScriptRoot 'start-server.ps1') -Environment Production
  Wait-ForHttpEndpoint -Uri 'http://127.0.0.1:3104/api/health'
}

if ($BootstrapOwner) {
  Wait-ForHttpEndpoint -Uri 'http://127.0.0.1:3104/api/bootstrap/status'
  $status = Invoke-RestMethod -Uri 'http://127.0.0.1:3104/api/bootstrap/status' -Method Get
  $ownerPassword = '1234'
  Set-Content -Path (Join-Path $secretsDir 'initial-owner.password') -Value $ownerPassword -Encoding ascii -NoNewline
  if (-not $status.ownerExists) {
    $body = @{
      username = $ownerUsername
      displayName = $ownerDisplayName
      password = $ownerPassword
    } | ConvertTo-Json

    Invoke-RestMethod `
      -Uri 'http://127.0.0.1:3104/api/bootstrap/owner' `
      -Method Post `
      -ContentType 'application/json' `
      -Body $body | Out-Null

  }

  $ownerInfoPath = Join-Path $secretsDir 'initial-owner.txt'
  try {
    @(
      "login_url=http://127.0.0.1:3104/login"
      "username=$ownerUsername"
      "password=$ownerPassword"
    ) | Set-Content -Path $ownerInfoPath -Encoding ascii
  } catch {
    Write-Warning "Owner credential summary file is locked and could not be updated: $ownerInfoPath"
  }
}

Write-Host "Initialized central runtime."
Write-Host "Server dir: $serverDir"
Write-Host "Env file: $envFilePath"
Write-Host "PostgreSQL data: $postgresDataDir"
Write-Host "PostgreSQL port: $postgresPort"
Write-Host "Storage root: $prodStorageDir"
Write-Host "Cloudflared dir: $cloudflaredDir"
