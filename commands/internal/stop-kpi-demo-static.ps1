param(
  [int]$Port = 5500
)

$ErrorActionPreference = 'Stop'

$internalDir = $PSScriptRoot
$varDir = Join-Path $internalDir 'var'
$pidFilePath = Join-Path $varDir 'kpi-demo-static.pid'

function Test-KpiDemoStaticServer {
  param([int]$TargetPort)

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/KPI.html" -UseBasicParsing -TimeoutSec 3
    return ($response.StatusCode -eq 200 -and $response.Content -match 'KPI Demo Management Console')
  } catch {
    return $false
  }
}

$candidatePids = @()
if (Test-Path $pidFilePath) {
  $savedPid = (Get-Content -Path $pidFilePath -Raw -Encoding ascii).Trim()
  $parsedPid = 0
  if ([int]::TryParse($savedPid, [ref]$parsedPid) -and $parsedPid -gt 0) {
    $candidatePids += $parsedPid
  }
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener -and (Test-KpiDemoStaticServer -TargetPort $Port)) {
  $candidatePids += [int]$listener.OwningProcess
}

$candidatePids = $candidatePids | Select-Object -Unique
foreach ($candidatePid in $candidatePids) {
  $process = Get-Process -Id $candidatePid -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $candidatePid -Force
    Remove-Item -Path $pidFilePath -ErrorAction SilentlyContinue
    Write-Host "Stopped KPI Demo static server on port $Port."
    exit 0
  }
}

Remove-Item -Path $pidFilePath -ErrorAction SilentlyContinue
Write-Host "KPI Demo static server is already stopped."
