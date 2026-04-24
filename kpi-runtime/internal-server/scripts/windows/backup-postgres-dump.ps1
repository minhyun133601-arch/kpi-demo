param(
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

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

function Get-EnvFilePaths {
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

  return @($candidatePaths | Select-Object -Unique)
}

function Get-EnvFileValue {
  param(
    [string]$ServerDir,
    [string]$Key
  )

  foreach ($candidatePath in Get-EnvFilePaths -ServerDir $ServerDir) {
    if (-not (Test-Path $candidatePath)) {
      continue
    }

    foreach ($line in Get-Content -Path $candidatePath -Encoding utf8) {
      $trimmed = ([string]$line).Trim()
      if (-not $trimmed -or $trimmed.StartsWith('#')) {
        continue
      }
      if (-not $trimmed.StartsWith("$Key=")) {
        continue
      }

      return $trimmed.Substring($Key.Length + 1).Trim().Trim('"')
    }
  }

  return ''
}

function Resolve-PostgresDumpPath {
  $pathCommand = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($pathCommand) {
    return $pathCommand.Source
  }

  $candidatePaths = @(
    (Join-Path $env:ProgramFiles 'PostgreSQL\17\bin\pg_dump.exe'),
    (Join-Path $env:ProgramFiles 'PostgreSQL\16\bin\pg_dump.exe'),
    (Join-Path $env:ProgramFiles 'PostgreSQL\15\bin\pg_dump.exe')
  )

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path $candidatePath) {
      return (Resolve-Path $candidatePath).Path
    }
  }

  $recursiveCandidate = Get-ChildItem -Path (Join-Path $env:ProgramFiles 'PostgreSQL') -Recurse -Filter pg_dump.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like '*\bin\pg_dump.exe' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($recursiveCandidate) {
    return $recursiveCandidate.FullName
  }

  throw 'pg_dump_not_found'
}

function Convert-DatabaseUrl {
  param([string]$DatabaseUrl)

  $uri = [Uri]$DatabaseUrl
  if ($uri.Scheme -notin @('postgres', 'postgresql')) {
    throw "unsupported_database_url_scheme: $($uri.Scheme)"
  }

  $user = ''
  $password = ''
  if (-not [string]::IsNullOrWhiteSpace($uri.UserInfo)) {
    $userParts = $uri.UserInfo.Split(':', 2)
    $user = [Uri]::UnescapeDataString($userParts[0])
    if ($userParts.Length -gt 1) {
      $password = [Uri]::UnescapeDataString($userParts[1])
    }
  }

  $databaseName = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
  if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw 'database_name_missing'
  }

  return [ordered]@{
    host = $uri.Host
    port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    user = $user
    password = $password
    databaseName = $databaseName
  }
}

$databaseUrl = if ($env:KPI_DATABASE_URL) {
  $env:KPI_DATABASE_URL
} else {
  Get-EnvFileValue -ServerDir $serverDir -Key 'KPI_DATABASE_URL'
}
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  $databaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
}

$storageRootValue = if ($env:KPI_STORAGE_ROOT) {
  $env:KPI_STORAGE_ROOT
} else {
  Get-EnvFileValue -ServerDir $serverDir -Key 'KPI_STORAGE_ROOT'
}
$storageRoot = Convert-ToAbsolutePath -BaseDir $serverDir -PathValue $storageRootValue
$dumpRoot = Join-Path $storageRoot 'backups\postgres-dumps'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetPath = if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  Join-Path $dumpRoot "postgres-dump-$timestamp.dump"
} elseif ([System.IO.Path]::IsPathRooted($OutputPath)) {
  [System.IO.Path]::GetFullPath($OutputPath)
} else {
  [System.IO.Path]::GetFullPath((Join-Path $serverDir $OutputPath))
}

New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($targetPath)) -Force | Out-Null

$pgDumpPath = Resolve-PostgresDumpPath
$connection = Convert-DatabaseUrl -DatabaseUrl $databaseUrl
$previousPgPassword = $env:PGPASSWORD
try {
  if (-not [string]::IsNullOrEmpty($connection.password)) {
    $env:PGPASSWORD = $connection.password
  }

  $arguments = @(
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    "--file=$targetPath",
    "--host=$($connection.host)",
    "--port=$($connection.port)"
  )
  if (-not [string]::IsNullOrWhiteSpace($connection.user)) {
    $arguments += "--username=$($connection.user)"
  }
  $arguments += "--dbname=$($connection.databaseName)"

  & $pgDumpPath @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump_failed: exit $LASTEXITCODE"
  }
} finally {
  $env:PGPASSWORD = $previousPgPassword
}

$dumpFile = Get-Item -Path $targetPath
[ordered]@{
  ok = $true
  dumpPath = $dumpFile.FullName
  bytes = $dumpFile.Length
  databaseHost = $connection.host
  databasePort = $connection.port
  databaseName = $connection.databaseName
  pgDumpPath = $pgDumpPath
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Depth 5
