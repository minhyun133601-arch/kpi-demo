param(
  [string]$TaskName = 'KPI Demo Runtime Startup',
  [int]$DelaySeconds = 20,
  [string]$StartupFileName = 'KPI-Central-Autostart.vbs',
  [string]$LegacyShortcutName = 'KPI Demo Runtime Startup.lnk'
)

$ErrorActionPreference = 'Stop'

$startupDirectory = [Environment]::GetFolderPath('Startup')
if ([string]::IsNullOrWhiteSpace($startupDirectory)) {
  throw 'Windows Startup folder could not be resolved.'
}

$startupScriptPath = (Resolve-Path (Join-Path $PSScriptRoot 'start-central-stack.startup.ps1')).Path
$startupFilePath = Join-Path $startupDirectory $StartupFileName
$legacyShortcutPath = Join-Path $startupDirectory $LegacyShortcutName
$startupCommand = "& `"$startupScriptPath`" -DelaySeconds $DelaySeconds"
$encodedCommand = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($startupCommand))
$launcherCommand = "powershell.exe -NoProfile -WindowStyle Hidden -EncodedCommand $encodedCommand"
$scriptBody = @"
Set shell = CreateObject("WScript.Shell")
command = "$launcherCommand"
shell.Run command, 0, False
"@

New-Item -ItemType Directory -Path $startupDirectory -Force | Out-Null
Set-Content -LiteralPath $startupFilePath -Value $scriptBody -Encoding ASCII
if (Test-Path -LiteralPath $legacyShortcutPath) {
  Remove-Item -LiteralPath $legacyShortcutPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Registered startup script: $startupFilePath"
Write-Host "Command: $launcherCommand"
