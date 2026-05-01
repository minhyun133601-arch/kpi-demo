param()

$ErrorActionPreference = 'Stop'

$appDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$varDir = Join-Path $appDir 'var'
$portFilePath = Join-Path $varDir 'ops-console-port.txt'
$candidatePorts = @()

if (Test-Path $portFilePath) {
  $savedPort = (Get-Content -Path $portFilePath -Raw -Encoding ascii).Trim()
  $parsedPort = 0
  if ([int]::TryParse($savedPort, [ref]$parsedPort) -and $parsedPort -gt 0) {
    $candidatePorts += $parsedPort
  }
}

$candidatePorts += 3215, 3216, 3217, 3218
$candidatePorts = $candidatePorts | Select-Object -Unique

foreach ($candidatePort in $candidatePorts) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $candidatePort -ErrorAction SilentlyContinue
  if (-not $listener) {
    continue
  }

  try {
    $response = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/app/health" -f $candidatePort) -Method Get -TimeoutSec 3
    if ($response.ok -eq $true) {
      Stop-Process -Id $listener.OwningProcess -Force
      Write-Host "Stopped KPI ops console on port $candidatePort."
      exit 0
    }
  } catch {
    continue
  }
}

Write-Host 'KPI ops console is already stopped.'
