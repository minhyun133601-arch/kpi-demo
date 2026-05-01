function Get-KpiPostgresBinCandidates {
  param([string]$ServerDir)

  $candidates = New-Object System.Collections.Generic.List[string]

  if ($env:KPI_POSTGRES_BIN_DIR) {
    $candidates.Add($env:KPI_POSTGRES_BIN_DIR)
  }

  $localToolRoots = @(
    (Join-Path $ServerDir 'var\tools'),
    (Join-Path $ServerDir 'var\central-runtime\tools')
  )

  foreach ($localToolsDir in $localToolRoots) {
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
  }

  foreach ($programRoot in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
    if (-not $programRoot) {
      continue
    }
    $candidates.Add((Join-Path $programRoot 'PostgreSQL\17\bin'))
    $candidates.Add((Join-Path $programRoot 'PostgreSQL\16\bin'))
    $candidates.Add((Join-Path $programRoot 'PostgreSQL\15\bin'))
  }

  return $candidates | Where-Object { $_ } | Select-Object -Unique
}

function Resolve-KpiPostgresBinDir {
  param(
    [string]$ServerDir,
    [string]$RequiredExecutable = 'psql.exe'
  )

  $pathCommand = Get-Command $RequiredExecutable -ErrorAction SilentlyContinue
  if ($pathCommand -and $pathCommand.Source -and (Test-Path $pathCommand.Source)) {
    return (Split-Path -Parent $pathCommand.Source)
  }

  foreach ($candidate in (Get-KpiPostgresBinCandidates -ServerDir $ServerDir)) {
    $executablePath = Join-Path $candidate $RequiredExecutable
    if (Test-Path $executablePath) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "PostgreSQL executable was not found: $RequiredExecutable. Install PostgreSQL 15-17, set KPI_POSTGRES_BIN_DIR, or place portable PostgreSQL tools under kpi-runtime/internal-server/var/tools/."
}
