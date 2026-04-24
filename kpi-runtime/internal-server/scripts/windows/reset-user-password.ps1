param(
  [Parameter(Mandatory = $true)]
  [string]$Username,

  [Parameter(Mandatory = $true)]
  [string]$Password
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Push-Location $serverDir
try {
  node src/scripts/resetUserPassword.js --username="$Username" --password="$Password"
} finally {
  Pop-Location
}
