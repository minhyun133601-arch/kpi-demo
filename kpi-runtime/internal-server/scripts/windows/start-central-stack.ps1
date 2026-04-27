param(
  [switch]$SkipBootstrapOwner
)

$ErrorActionPreference = 'Stop'

$bootstrapOwner = -not $SkipBootstrapOwner.IsPresent
& (Join-Path $PSScriptRoot 'initialize-central-runtime.ps1') -StartServer -BootstrapOwner:$bootstrapOwner

Write-Host "Central KPI stack is ready."
Write-Host "Health: http://127.0.0.1:3104/api/health"
Write-Host "Login: http://127.0.0.1:3104/login"
Write-Host "Demo login: 1234 / 1234"
