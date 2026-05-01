param(
  [switch]$BootstrapOwner
)

$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'initialize-central-runtime.ps1') -StartServer -BootstrapOwner:$BootstrapOwner

Write-Host "Central KPI stack is ready."
Write-Host "Health: http://127.0.0.1:3104/api/health"
Write-Host "Login: http://127.0.0.1:3104/login"
