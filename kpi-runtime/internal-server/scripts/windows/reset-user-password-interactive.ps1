param()

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$username = Read-Host 'Reset target username'
$passwordSecure = Read-Host 'New password' -AsSecureString
$confirmSecure = Read-Host 'Confirm new password' -AsSecureString

$password = ([System.Net.NetworkCredential]::new('', $passwordSecure)).Password
$confirmPassword = ([System.Net.NetworkCredential]::new('', $confirmSecure)).Password

if ([string]::IsNullOrWhiteSpace($username)) {
  throw 'Username is required.'
}

if ([string]::IsNullOrWhiteSpace($password)) {
  throw 'Password is required.'
}

if ($password -ne $confirmPassword) {
  throw 'Password confirmation does not match.'
}

Push-Location $serverDir
try {
  node src/scripts/resetUserPassword.js --username="$($username.Trim())" --password="$password"
} finally {
  Pop-Location
}
