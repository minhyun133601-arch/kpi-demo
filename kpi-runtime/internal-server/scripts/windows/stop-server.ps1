param(
  [ValidateSet('Default', 'Development', 'Production')]
  [string]$Environment = 'Default',
  [string]$EnvFile,
  [int]$Port
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Resolve-EnvFilePath {
  param(
    [string]$ServerDir,
    [string]$Environment,
    [string]$EnvFile
  )

  if ($EnvFile) {
    $candidate = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $ServerDir $EnvFile }
    if (Test-Path $candidate) {
      return (Resolve-Path $candidate).Path
    }
    return $null
  }

  $preferred = switch ($Environment) {
    'Development' { Join-Path $ServerDir '.env.development.local' }
    'Production' { Join-Path $ServerDir '.env.production.local' }
    default { Join-Path $ServerDir '.env' }
  }

  if (Test-Path $preferred) {
    return (Resolve-Path $preferred).Path
  }

  $fallback = Join-Path $ServerDir '.env'
  if (Test-Path $fallback) {
    return (Resolve-Path $fallback).Path
  }

  return $null
}

function Read-PortFromEnvFile {
  param([string]$FilePath)

  if (-not $FilePath -or -not (Test-Path $FilePath)) {
    return $null
  }

  foreach ($line in Get-Content -Path $FilePath -Encoding utf8) {
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
      return $parsedPort
    }
  }

  return $null
}

$resolvedPort = if ($PSBoundParameters.ContainsKey('Port') -and $Port -gt 0) {
  $Port
} else {
  $resolvedEnvFile = Resolve-EnvFilePath -ServerDir $serverDir -Environment $Environment -EnvFile $EnvFile
  $envPort = Read-PortFromEnvFile -FilePath $resolvedEnvFile
  if ($envPort) { $envPort } else { 3100 }
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $resolvedPort -ErrorAction SilentlyContinue
if (-not $listener) {
  Write-Host "KPI demo runtime is not listening on port $resolvedPort."
  exit 0
}

Stop-Process -Id $listener.OwningProcess -Force
Start-Sleep -Seconds 1

Write-Host "Stopped KPI demo runtime process $($listener.OwningProcess) on port $resolvedPort."
