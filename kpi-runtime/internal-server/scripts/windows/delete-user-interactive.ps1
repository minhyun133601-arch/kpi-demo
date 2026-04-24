param()

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$username = Read-Host 'Delete target username'
if ([string]::IsNullOrWhiteSpace($username)) {
  throw 'Username is required.'
}

$confirm = Read-Host "Type DELETE to remove user '$($username.Trim())'"
if ($confirm -ne 'DELETE') {
  throw 'Deletion cancelled.'
}

Push-Location $serverDir
try {
  node src/scripts/deleteUser.js --username="$($username.Trim())"
} finally {
  Pop-Location
}
