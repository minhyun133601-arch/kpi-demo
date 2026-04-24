param(
  [string]$DownloadUrl = 'https://sbp.enterprisedb.com/getfile.jsp?fileid=1260148',
  [string]$VersionLabel = '17.9'
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$toolsDir = Join-Path $serverDir 'var\tools'
$targetDir = Join-Path $toolsDir "postgresql-$VersionLabel"
$zipPath = Join-Path $toolsDir "postgresql-$VersionLabel-windows-x64-binaries.zip"
$binDir = Join-Path $targetDir 'pgsql\bin'

if (Test-Path (Join-Path $binDir 'psql.exe')) {
  Write-Host "Portable PostgreSQL $VersionLabel already exists: $binDir"
  exit 0
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

if (-not (Test-Path $zipPath)) {
  Write-Host "Downloading portable PostgreSQL $VersionLabel..."
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $zipPath
}

$resolvedToolsDir = (Resolve-Path $toolsDir).Path
$resolvedTargetDir = [System.IO.Path]::GetFullPath($targetDir)
if (-not $resolvedTargetDir.StartsWith($resolvedToolsDir, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to extract outside tools directory: $resolvedTargetDir"
}

if (Test-Path -LiteralPath $resolvedTargetDir) {
  Get-ChildItem -LiteralPath $resolvedTargetDir -Recurse -Force -ErrorAction SilentlyContinue |
    ForEach-Object { $_.Attributes = [System.IO.FileAttributes]::Normal }
  (Get-Item -LiteralPath $resolvedTargetDir -Force).Attributes = [System.IO.FileAttributes]::Normal
  Remove-Item -LiteralPath $resolvedTargetDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $resolvedTargetDir | Out-Null

Write-Host "Extracting portable PostgreSQL runtime files..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $prefixes = @('pgsql/bin/', 'pgsql/lib/', 'pgsql/share/')
  foreach ($entry in $zip.Entries) {
    if ([string]::IsNullOrWhiteSpace($entry.Name)) {
      continue
    }

    $entryPath = $entry.FullName.Replace('\', '/')
    $include = $false
    foreach ($prefix in $prefixes) {
      if ($entryPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        $include = $true
        break
      }
    }
    if (-not $include) {
      continue
    }

    $targetPath = Join-Path $resolvedTargetDir ($entryPath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
    $targetFullPath = [System.IO.Path]::GetFullPath($targetPath)
    if (-not $targetFullPath.StartsWith($resolvedTargetDir, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Blocked unsafe zip path: $entryPath"
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetFullPath) | Out-Null
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetFullPath, $true)
  }
} finally {
  $zip.Dispose()
}

if (-not (Test-Path (Join-Path $binDir 'psql.exe'))) {
  throw "Portable PostgreSQL extraction did not create psql.exe: $binDir"
}

Write-Host "Portable PostgreSQL $VersionLabel is ready: $binDir"
