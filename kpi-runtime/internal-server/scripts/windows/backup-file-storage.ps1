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

function Get-ConfiguredStorageRoot {
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

  foreach ($candidatePath in @($candidatePaths | Select-Object -Unique)) {
    if (-not (Test-Path $candidatePath)) {
      continue
    }

    foreach ($line in Get-Content -Path $candidatePath -Encoding utf8) {
      $trimmed = ([string]$line).Trim()
      if (-not $trimmed -or $trimmed.StartsWith('#')) {
        continue
      }
      if (-not $trimmed.StartsWith('KPI_STORAGE_ROOT=')) {
        continue
      }

      $value = $trimmed.Substring('KPI_STORAGE_ROOT='.Length).Trim().Trim('"')
      return Convert-ToAbsolutePath -BaseDir $ServerDir -PathValue $value
    }
  }

  return Convert-ToAbsolutePath -BaseDir $ServerDir -PathValue 'var'
}

$storageRoot = Get-ConfiguredStorageRoot -ServerDir $serverDir
$sourceRoot = Join-Path $storageRoot 'files'
$backupRoot = Join-Path $storageRoot 'backups\file-storage'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetRoot = Join-Path $backupRoot $timestamp
$targetPath = Join-Path $targetRoot 'files'

if (-not (Test-Path $sourceRoot)) {
  throw "file_storage_root_not_found: $sourceRoot"
}

New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
Copy-Item -Path $sourceRoot -Destination $targetRoot -Recurse -Force

$copiedFiles = @(Get-ChildItem -Path $targetPath -File -Recurse -ErrorAction SilentlyContinue)
$summary = [ordered]@{
  ok = $true
  sourceRoot = $sourceRoot
  backupRoot = $targetPath
  fileCount = $copiedFiles.Count
  totalBytes = ($copiedFiles | Measure-Object -Property Length -Sum).Sum
}

$summary | ConvertTo-Json -Depth 5
