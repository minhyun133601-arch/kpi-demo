param(
  [string]$TaskName = 'KPI Demo Runtime Startup',
  [string]$StartupFileName = 'KPI-Central-Autostart.vbs',
  [string]$LegacyShortcutName = 'KPI Demo Runtime Startup.lnk'
)

$ErrorActionPreference = 'Stop'

$startupDirectory = [Environment]::GetFolderPath('Startup')
if ([string]::IsNullOrWhiteSpace($startupDirectory)) {
  throw 'Windows Startup folder could not be resolved.'
}

$startupFilePath = Join-Path $startupDirectory $StartupFileName
$legacyShortcutPath = Join-Path $startupDirectory $LegacyShortcutName
$removedItems = @()

if (Test-Path -LiteralPath $startupFilePath) {
  Remove-Item -LiteralPath $startupFilePath -Force
  $removedItems += $startupFilePath
}

if (Test-Path -LiteralPath $legacyShortcutPath) {
  Remove-Item -LiteralPath $legacyShortcutPath -Force
  $removedItems += $legacyShortcutPath
}

if (-not $removedItems.Count) {
  Write-Host "Startup script was not found: $startupFilePath"
  exit 0
}

Write-Host "Removed startup entries:"
$removedItems | ForEach-Object { Write-Host $_ }
