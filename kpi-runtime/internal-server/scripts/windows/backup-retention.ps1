param(
  [int]$DaysToKeep = 30,
  [int]$KeepLatest = 10,
  [switch]$Force
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

function Get-RetentionPlan {
  param(
    [string]$Root,
    [string]$Type
  )

  $items = if ($Type -eq 'file') {
    @(Get-ChildItem -Path $Root -File -ErrorAction SilentlyContinue)
  } else {
    @(Get-ChildItem -Path $Root -Directory -ErrorAction SilentlyContinue)
  }
  $items = @($items | Where-Object { $_.Name -ne '.gitkeep' })

  $sorted = $items | Sort-Object LastWriteTime -Descending
  $cutoff = (Get-Date).AddDays(-1 * [Math]::Abs($DaysToKeep))
  $wouldDelete = @()

  for ($index = 0; $index -lt $sorted.Count; $index++) {
    $item = $sorted[$index]
    $keepByCount = $index -lt $KeepLatest
    $keepByAge = $item.LastWriteTime -ge $cutoff
    if ($keepByCount -or $keepByAge) {
      continue
    }
    $wouldDelete += $item
  }

  [ordered]@{
    root = $Root
    itemType = $Type
    totalCount = $sorted.Count
    deleteCount = $wouldDelete.Count
    wouldDelete = @($wouldDelete | ForEach-Object { $_.FullName })
    items = @($sorted | ForEach-Object {
      [ordered]@{
        path = $_.FullName
        lastWriteTime = $_.LastWriteTime.ToString('o')
      }
    })
  }
}

function Invoke-RetentionDelete {
  param($Plan)
  foreach ($path in $Plan.wouldDelete) {
    if ($Plan.itemType -eq 'file') {
      Remove-Item -Path $path -Force
    } else {
      Remove-Item -Path $path -Recurse -Force
    }
  }
}

$storageRoot = Get-ConfiguredStorageRoot -ServerDir $serverDir
$postgresDumpPlan = Get-RetentionPlan -Root (Join-Path $storageRoot 'backups\postgres-dumps') -Type 'file'
$runtimePlan = Get-RetentionPlan -Root (Join-Path $storageRoot 'backups\runtime-snapshots') -Type 'file'
$fileStoragePlan = Get-RetentionPlan -Root (Join-Path $storageRoot 'backups\file-storage') -Type 'directory'

if ($Force) {
  Invoke-RetentionDelete -Plan $postgresDumpPlan
  Invoke-RetentionDelete -Plan $runtimePlan
  Invoke-RetentionDelete -Plan $fileStoragePlan
}

[ordered]@{
  ok = $true
  mode = if ($Force) { 'delete' } else { 'preview' }
  daysToKeep = $DaysToKeep
  keepLatest = $KeepLatest
  postgresDumps = $postgresDumpPlan
  runtimeSnapshots = $runtimePlan
  fileStorage = $fileStoragePlan
} | ConvertTo-Json -Depth 8
