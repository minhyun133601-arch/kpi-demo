param(
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

$appDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$opsConsoleDir = Join-Path $appDir 'ops-console'
$serverScriptPath = Join-Path $opsConsoleDir 'server.mjs'
$varDir = Join-Path $appDir 'var'
$logDir = Join-Path $varDir 'logs'
$stdoutLog = Join-Path $logDir 'ops-console.stdout.log'
$stderrLog = Join-Path $logDir 'ops-console.stderr.log'
$portFilePath = Join-Path $varDir 'ops-console-port.txt'
$candidatePorts = @(3215, 3216, 3217, 3218)

function Resolve-NodeExecutablePath {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command -and $command.Source -and (Test-Path $command.Source)) {
    return $command.Source
  }

  $candidatePaths = @(
    'C:\Program Files\nodejs\node.exe'
  )

  foreach ($candidatePath in $candidatePaths) {
    if (Test-Path $candidatePath) {
      return $candidatePath
    }
  }

  throw 'Node.js executable was not found. Install Node.js or add node.exe to PATH.'
}

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

    $expectedAppRoot = (Resolve-Path $appDir).Path
    $actualAppRoot = [System.IO.Path]::GetFullPath($responseAppRoot)
    return $actualAppRoot.Equals($expectedAppRoot, [System.StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

function Wait-ForAppHealth {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-AppHealth -Port $Port) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "KPI ops console did not become ready on port $Port."
}

New-Item -ItemType Directory -Force -Path $varDir, $logDir | Out-Null

foreach ($candidatePort in $candidatePorts) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $candidatePort -ErrorAction SilentlyContinue
  if (-not $listener) {
    $selectedPort = $candidatePort
    break
  }

  if (Test-AppHealth -Port $candidatePort) {
    $url = "http://127.0.0.1:$candidatePort"
    Set-Content -Path $portFilePath -Value $candidatePort -Encoding ascii
    if (-not $NoOpen) {
      Start-Process $url
    }
    Write-Host "KPI Demo command console is already running."
    Write-Host "URL: $url"
    Write-Host "Console port: $candidatePort"
    Write-Host "Static demo port: 5500"
    Write-Host "Optional runtime port: 3104"
    Write-Host "Optional DB port: 5400"
    exit 0
  }
}

if (-not $selectedPort) {
  throw 'No available local port was found for the KPI Demo command console.'
}

$nodeExecutablePath = Resolve-NodeExecutablePath
$previousPort = $env:KPI_OPS_CONSOLE_PORT
try {
  $env:KPI_OPS_CONSOLE_PORT = [string]$selectedPort
  $process = Start-Process `
    -FilePath $nodeExecutablePath `
    -ArgumentList $serverScriptPath `
    -WorkingDirectory $opsConsoleDir `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog
} finally {
  if ($null -eq $previousPort) {
    Remove-Item Env:KPI_OPS_CONSOLE_PORT -ErrorAction SilentlyContinue
  } else {
    $env:KPI_OPS_CONSOLE_PORT = $previousPort
  }
}

Wait-ForAppHealth -Port $selectedPort
Set-Content -Path $portFilePath -Value $selectedPort -Encoding ascii
$url = "http://127.0.0.1:$selectedPort"
if (-not $NoOpen) {
  Start-Process $url
}

Write-Host "Started KPI Demo command console."
Write-Host "URL: $url"
Write-Host "Console port: $selectedPort"
Write-Host "Static demo: http://127.0.0.1:5500/KPI.html"
Write-Host "Optional runtime login: http://127.0.0.1:3104/login"
Write-Host "Optional runtime demo account: 1234 / 1234"
Write-Host "Optional DB port: 5400"
Write-Host "PID: $($process.Id)"
Write-Host "Stdout: $stdoutLog"
Write-Host "Stderr: $stderrLog"
