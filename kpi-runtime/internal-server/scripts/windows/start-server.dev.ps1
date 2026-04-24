param(
  [switch]$ForceRestart,
  [string]$EnvFile
)

$scriptPath = Join-Path $PSScriptRoot 'start-server.ps1'
& $scriptPath -Environment Development -ForceRestart:$ForceRestart -EnvFile $EnvFile
