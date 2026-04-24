param(
  [string]$EnvFile,
  [string]$Sql,
  [switch]$ListTables
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Resolve-EnvFilePath {
  param(
    [string]$ServerDir,
    [string]$RequestedEnvFile
  )

  if ($RequestedEnvFile) {
    $candidate = if ([System.IO.Path]::IsPathRooted($RequestedEnvFile)) {
      $RequestedEnvFile
    } else {
      Join-Path $ServerDir $RequestedEnvFile
    }
    if (-not (Test-Path $candidate)) {
      throw "Requested env file was not found: $candidate"
    }
    return (Resolve-Path $candidate).Path
  }

  $defaultPath = Join-Path $ServerDir '.env.production.local'
  if (Test-Path $defaultPath) {
    return (Resolve-Path $defaultPath).Path
  }

  throw "Env file was not found: $defaultPath"
}

function Read-EnvMap {
  param([string]$FilePath)

  $map = @{}
  foreach ($line in Get-Content -Path $FilePath -Encoding utf8) {
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    $separatorIndex = $trimmed.IndexOf('=')
    if ($separatorIndex -le 0) {
      continue
    }

    $key = $trimmed.Substring(0, $separatorIndex).Trim()
    if (-not $key) {
      continue
    }

    $value = $trimmed.Substring($separatorIndex + 1).Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $map[$key] = $value
  }

  return $map
}

function Resolve-PsqlExecutablePath {
  $command = Get-Command psql -ErrorAction SilentlyContinue
  if ($command -and $command.Source -and (Test-Path $command.Source)) {
    return $command.Source
  }

  $candidatePaths = @(
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe'
  )

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path $candidatePath) {
      return $candidatePath
    }
  }

  throw 'psql.exe was not found. Install PostgreSQL client tools first.'
}

function Parse-DatabaseUrl {
  param([string]$DatabaseUrl)

  $uri = [System.Uri]$DatabaseUrl
  if ($uri.Scheme -notin @('postgresql', 'postgres')) {
    throw "Unsupported database URL scheme: $($uri.Scheme)"
  }

  $databaseName = $uri.AbsolutePath.TrimStart('/')
  if (-not $databaseName) {
    throw 'Database name is missing in KPI_DATABASE_URL.'
  }

  $userInfo = $uri.UserInfo.Split(':', 2)
  if ($userInfo.Count -lt 2) {
    throw 'Database username or password is missing in KPI_DATABASE_URL.'
  }

  return [ordered]@{
    host = $uri.Host
    port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    database = $databaseName
    username = [System.Uri]::UnescapeDataString($userInfo[0])
    password = [System.Uri]::UnescapeDataString($userInfo[1])
  }
}

$resolvedEnvFile = Resolve-EnvFilePath -ServerDir $serverDir -RequestedEnvFile $EnvFile
$envMap = Read-EnvMap -FilePath $resolvedEnvFile
$databaseUrl = $envMap['KPI_DATABASE_URL']
if (-not $databaseUrl) {
  throw 'KPI_DATABASE_URL is missing in the selected env file.'
}

$connection = Parse-DatabaseUrl -DatabaseUrl $databaseUrl
$psqlPath = Resolve-PsqlExecutablePath
$startLocalPostgresScript = Join-Path $PSScriptRoot 'start-local-postgres.ps1'

if (Test-Path $startLocalPostgresScript) {
  & $startLocalPostgresScript | Out-Host
}

$arguments = @(
  '-v', 'ON_ERROR_STOP=1',
  '-h', $connection.host,
  '-p', [string]$connection.port,
  '-U', $connection.username,
  '-d', $connection.database
)

if ($ListTables) {
  $arguments += @('-c', '\dt')
} elseif ($Sql) {
  $arguments += @('-c', $Sql)
}

$env:PGPASSWORD = $connection.password
try {
  & $psqlPath @arguments
  exit $LASTEXITCODE
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
