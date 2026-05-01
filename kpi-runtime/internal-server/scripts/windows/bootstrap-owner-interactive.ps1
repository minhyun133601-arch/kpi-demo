param()

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$envFilePath = Join-Path $serverDir '.env.production.local'
$port = 3104

if (Test-Path $envFilePath) {
  foreach ($line in Get-Content -Path $envFilePath -Encoding utf8) {
    $trimmed = ([string]$line).Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }
    if (-not $trimmed.StartsWith('KPI_SERVER_PORT=')) {
      continue
    }
    $value = $trimmed.Substring('KPI_SERVER_PORT='.Length).Trim().Trim('"')
    $parsedPort = 0
    if ([int]::TryParse($value, [ref]$parsedPort) -and $parsedPort -gt 0) {
      $port = $parsedPort
      break
    }
  }
}

$baseUrl = "http://127.0.0.1:$port"

try {
  $status = Invoke-RestMethod -Uri "$baseUrl/api/bootstrap/status" -Method Get
} catch {
  throw "Server is not reachable. Start the server first with 03-서버-열기.cmd. $($_.Exception.Message)"
}

if (-not $status.authEnabled) {
  throw 'Auth is disabled. Owner bootstrap is not required in the current server mode.'
}

if (-not $status.ownerBootstrapEnabled) {
  throw 'Owner bootstrap is disabled because an owner already exists.'
}

Write-Host '안내: 새 로그인 아이디(username)는 영문/숫자와 . _ - 만 허용합니다.'
Write-Host '안내: 한글 이름은 display name 에 넣어 주세요.'

$username = Read-Host 'Owner username'
$displayName = Read-Host 'Owner display name'
$passwordSecure = Read-Host 'Owner password' -AsSecureString
$confirmSecure = Read-Host 'Confirm owner password' -AsSecureString

$password = ([System.Net.NetworkCredential]::new('', $passwordSecure)).Password
$confirmPassword = ([System.Net.NetworkCredential]::new('', $confirmSecure)).Password

if ([string]::IsNullOrWhiteSpace($username)) {
  throw 'Username is required.'
}

if ($username.Trim() -notmatch '^[A-Za-z0-9._-]+$') {
  throw 'Username can use only English letters, numbers, dot(.), underscore(_), and hyphen(-).'
}

if ([string]::IsNullOrWhiteSpace($displayName)) {
  $displayName = $username
}

if ([string]::IsNullOrWhiteSpace($password)) {
  throw 'Password is required.'
}

if ($password -ne $confirmPassword) {
  throw 'Password confirmation does not match.'
}

$body = @{
  username = $username.Trim()
  displayName = $displayName.Trim()
  password = $password
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "$baseUrl/api/bootstrap/owner" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body

Write-Host 'OWNER CREATED'
$response | ConvertTo-Json -Depth 5
