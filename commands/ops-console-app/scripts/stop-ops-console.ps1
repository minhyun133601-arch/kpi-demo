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
$expectedAppRoot = (Resolve-Path $appDir).Path

function Test-AppHealth {
  param([int]$Port)

  try {
    $response = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/app/health" -f $Port) -Method Get -TimeoutSec 3
    if ($response.ok -ne $true -or $response.app -ne 'kpi-ops-console') {
      return $false
    }

    $responseAppRoot = ''
    if ($response.PSObject.Properties.Name -contains 'appRoot') {
      $responseAppRoot = [string]$response.appRoot
    }
    if (-not $responseAppRoot) {
      return $false
    }

    $actualAppRoot = [System.IO.Path]::GetFullPath($responseAppRoot)
    return $actualAppRoot.Equals($expectedAppRoot, [System.StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

foreach ($candidatePort in $candidatePorts) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $candidatePort -ErrorAction SilentlyContinue
  if (-not $listener) {
    continue
  }

  if (Test-AppHealth -Port $candidatePort) {
    Stop-Process -Id $listener.OwningProcess -Force
    Write-Host "Stopped KPI Demo command console on port $candidatePort."
    exit 0
  }
}

Write-Host 'KPI Demo command console is already stopped.'
