param(
  [string]$UsernameHex,
  [string]$Password
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverRoot = Resolve-Path (Join-Path $scriptDir '..\..')

Push-Location $serverRoot
try {
    if ($UsernameHex) {
        $env:KPI_SMOKE_USERNAME_HEX = $UsernameHex
    }
    if ($Password) {
        $env:KPI_SMOKE_PASSWORD = $Password
    }
    npm run smoke:kpi-root
} finally {
    Remove-Item Env:KPI_SMOKE_USERNAME_HEX -ErrorAction SilentlyContinue
    Remove-Item Env:KPI_SMOKE_PASSWORD -ErrorAction SilentlyContinue
    Pop-Location
}
