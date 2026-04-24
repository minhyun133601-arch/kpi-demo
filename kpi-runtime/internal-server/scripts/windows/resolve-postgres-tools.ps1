function Get-KpiPostgresBinCandidates {
  param([string]$ServerDir)

  $candidates = New-Object System.Collections.Generic.List[string]

  if ($env:KPI_POSTGRES_BIN_DIR) {
    $candidates.Add($env:KPI_POSTGRES_BIN_DIR)
  }

  $localToolsDir = Join-Path $ServerDir 'var\tools'
  $localCandidates = @(
    (Join-Path $localToolsDir 'postgresql-17.9\pgsql\bin'),
    (Join-Path $localToolsDir 'postgresql-17\pgsql\bin'),
    (Join-Path $localToolsDir 'postgresql\pgsql\bin'),
    (Join-Path $localToolsDir 'postgresql\bin')
  )
  foreach ($candidate in $localCandidates) {
    $candidates.Add($candidate)
  }

  if (Test-Path $localToolsDir) {
    Get-ChildItem -Path $localToolsDir -Directory -Filter 'postgresql-*' -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending |
      ForEach-Object {
        $candidates.Add((Join-Path $_.FullName 'pgsql\bin'))
        $candidates.Add((Join-Path $_.FullName 'bin'))
      }
  }

  if ($env:ProgramFiles) {
    $candidates.Add((Join-Path $env:ProgramFiles 'PostgreSQL\17\bin'))
    $candidates.Add((Join-Path $env:ProgramFiles 'PostgreSQL\16\bin'))
    $candidates.Add((Join-Path $env:ProgramFiles 'PostgreSQL\15\bin'))
  }

  $command = Get-Command psql -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    $commandBin = Split-Path -Parent $command.Source
    if ($commandBin) {
      $candidates.Add($commandBin)
    }
  }

  return $candidates | Where-Object { $_ } | Select-Object -Unique
}

function Install-KpiPortablePostgres {
  param([string]$ServerDir)

  $installerScript = Join-Path $PSScriptRoot 'install-portable-postgres.ps1'
  if (-not (Test-Path $installerScript)) {
    throw "PostgreSQL tools were not found, and installer script is missing: $installerScript"
  }

  & $installerScript | Out-Host
}

function Resolve-KpiPostgresBinDir {
  param(
    [string]$ServerDir,
    [string]$RequiredExecutable = 'psql.exe',
    [switch]$InstallIfMissing
  )

  foreach ($candidate in (Get-KpiPostgresBinCandidates -ServerDir $ServerDir)) {
    $executablePath = Join-Path $candidate $RequiredExecutable
    if (Test-Path $executablePath) {
      return (Resolve-Path $candidate).Path
    }
  }

  if ($InstallIfMissing) {
    Install-KpiPortablePostgres -ServerDir $ServerDir
    foreach ($candidate in (Get-KpiPostgresBinCandidates -ServerDir $ServerDir)) {
      $executablePath = Join-Path $candidate $RequiredExecutable
      if (Test-Path $executablePath) {
        return (Resolve-Path $candidate).Path
      }
    }
  }

  throw "PostgreSQL executable was not found: $RequiredExecutable. Run scripts\windows\install-portable-postgres.ps1 first."
}
