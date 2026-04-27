param(
  [int]$Port = 5500,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

$internalDir = $PSScriptRoot
$commandsDir = (Resolve-Path (Join-Path $internalDir '..')).Path
$demoRoot = (Resolve-Path (Join-Path $commandsDir '..')).Path
$varDir = Join-Path $internalDir 'var'
$pidFilePath = Join-Path $varDir 'kpi-demo-static.pid'
$url = "http://127.0.0.1:$Port/KPI.html"

function Resolve-PythonCommand {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python -and $python.Source) {
    return $python.Source
  }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py -and $py.Source) {
    return $py.Source
  }

  throw 'Python was not found. Install Python or add it to PATH.'
}

function Test-KpiDemoStaticServer {
  param([int]$TargetPort)

  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/KPI.html" -UseBasicParsing -TimeoutSec 3
    return ($response.StatusCode -eq 200 -and $response.Content -match 'KPI Demo Management Console')
  } catch {
    return $false
  }
}

function Wait-ForKpiDemoStaticServer {
  param(
    [int]$TargetPort,
    [int]$TimeoutSeconds = 15
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-KpiDemoStaticServer -TargetPort $TargetPort) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "KPI Demo static server did not become ready on port $TargetPort."
}

New-Item -ItemType Directory -Force -Path $varDir | Out-Null

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  if (Test-KpiDemoStaticServer -TargetPort $Port) {
    Set-Content -Path $pidFilePath -Value $listener.OwningProcess -Encoding ascii
    if (-not $NoOpen) {
      Start-Process $url
    }
    Write-Host "KPI Demo static server is already running."
    Write-Host "Static demo: $url"
    Write-Host "Port: $Port"
    exit 0
  }

  throw "Port $Port is already in use by another process. Close that process or run this script with a different -Port value."
}

$pythonPath = Resolve-PythonCommand
$arguments = @('-m', 'http.server', [string]$Port)
if ((Split-Path -Leaf $pythonPath).ToLowerInvariant() -eq 'py.exe') {
  $arguments = @('-3') + $arguments
}

$process = Start-Process `
  -FilePath $pythonPath `
  -ArgumentList $arguments `
  -WorkingDirectory $demoRoot `
  -WindowStyle Minimized `
  -PassThru

Wait-ForKpiDemoStaticServer -TargetPort $Port
Set-Content -Path $pidFilePath -Value $process.Id -Encoding ascii
if (-not $NoOpen) {
  Start-Process $url
}

Write-Host "Started KPI Demo static server."
Write-Host "Static demo: $url"
Write-Host "Port: $Port"
Write-Host "PID: $($process.Id)"
Write-Host "Optional runtime login: http://127.0.0.1:3104/login"
Write-Host "Optional runtime demo account: 1234 / 1234"
