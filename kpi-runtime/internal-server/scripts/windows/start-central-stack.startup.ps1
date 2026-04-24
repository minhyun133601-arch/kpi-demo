param(
  [int]$DelaySeconds = 20
)

$ErrorActionPreference = 'Stop'

if ($DelaySeconds -gt 0) {
  Start-Sleep -Seconds $DelaySeconds
}

& (Join-Path $PSScriptRoot 'start-central-stack.ps1')
