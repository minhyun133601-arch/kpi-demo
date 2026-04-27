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
  throw 'Auth is disabled. Employee creation requires authenticated server mode.'
}

if (-not $status.ownerExists) {
  throw 'Owner does not exist yet. Create the owner first with 06-오너-생성.cmd.'
}

Write-Host '안내: 새 직원 로그인 아이디(username)는 영문/숫자와 . _ - 만 허용합니다.'
Write-Host '안내: 한글 이름은 Employee display name 에 넣어 주세요.'

$ownerUsername = Read-Host 'Owner username'
$ownerPasswordSecure = Read-Host 'Owner password' -AsSecureString
$employeeUsername = Read-Host 'Employee username'
$employeeDisplayName = Read-Host 'Employee display name'
$employeePasswordSecure = Read-Host 'Employee password' -AsSecureString
$confirmSecure = Read-Host 'Confirm employee password' -AsSecureString

$ownerPassword = ([System.Net.NetworkCredential]::new('', $ownerPasswordSecure)).Password
$employeePassword = ([System.Net.NetworkCredential]::new('', $employeePasswordSecure)).Password
$confirmPassword = ([System.Net.NetworkCredential]::new('', $confirmSecure)).Password

if ([string]::IsNullOrWhiteSpace($ownerUsername) -or [string]::IsNullOrWhiteSpace($ownerPassword)) {
  throw 'Owner login is required.'
}

if ([string]::IsNullOrWhiteSpace($employeeUsername)) {
  throw 'Employee username is required.'
}

if ($employeeUsername.Trim() -notmatch '^[A-Za-z0-9._-]+$') {
  throw 'Employee username can use only English letters, numbers, dot(.), underscore(_), and hyphen(-).'
}

if ([string]::IsNullOrWhiteSpace($employeeDisplayName)) {
  $employeeDisplayName = $employeeUsername
}

if ([string]::IsNullOrWhiteSpace($employeePassword)) {
  throw 'Employee password is required.'
}

if ($employeePassword -ne $confirmPassword) {
  throw 'Password confirmation does not match.'
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{
  username = $ownerUsername.Trim()
  password = $ownerPassword
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "$baseUrl/api/auth/login" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $loginBody `
  -WebSession $session `
  -UseBasicParsing | Out-Null

$createBody = @{
  username = $employeeUsername.Trim()
  displayName = $employeeDisplayName.Trim()
  password = $employeePassword
  roles = @('viewer')
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "$baseUrl/api/admin/users" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $createBody `
  -WebSession $session

try {
  Invoke-WebRequest -Uri "$baseUrl/api/auth/logout" -Method Post -WebSession $session -UseBasicParsing | Out-Null
} catch {
}

Write-Host 'EMPLOYEE CREATED'
$response | ConvertTo-Json -Depth 5
