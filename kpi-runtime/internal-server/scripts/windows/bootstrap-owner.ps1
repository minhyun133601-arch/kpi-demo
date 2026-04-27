param(
  [Parameter(Mandatory = $true)]
  [string]$Username,

  [Parameter(Mandatory = $true)]
  [string]$DisplayName,

  [Parameter(Mandatory = $true)]
  [string]$Password
)

$ErrorActionPreference = 'Stop'

$body = @{
  username = $Username
  displayName = $DisplayName
  password = $Password
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri 'http://127.0.0.1:3104/api/bootstrap/owner' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body

$response | ConvertTo-Json -Depth 5
