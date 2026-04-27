param(
  [string]$BaseUrl = 'http://127.0.0.1:3104'
)

$ErrorActionPreference = 'Stop'

$healthUrl = $BaseUrl.TrimEnd('/') + '/api/health'

try {
  $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
  if (-not $response.ok) {
    Write-Host 'SERVER ERROR'
    $response | ConvertTo-Json -Depth 5 -Compress
    exit 1
  }

  Write-Host 'SERVER UP'
  Write-Host ("HEALTH_URL={0}" -f $healthUrl)
  $response | ConvertTo-Json -Depth 5 -Compress
  exit 0
} catch {
  Write-Host 'SERVER DOWN'
  Write-Host $_.Exception.Message
  exit 1
}
