param(
  [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$cloudflaredPath = Join-Path $serverDir 'var\central-runtime\tools\cloudflared\cloudflared.exe'
$defaultConfigPath = Join-Path $serverDir 'var\central-runtime\cloudflared\config.yml'
$resolvedConfigPath = if ($ConfigPath) { $ConfigPath } else { $defaultConfigPath }

if (-not (Test-Path $cloudflaredPath)) {
  throw "cloudflared is missing. Run download-cloudflared.ps1 first."
}

if (-not (Test-Path $resolvedConfigPath)) {
  throw "Cloudflared config was not found: $resolvedConfigPath"
}

& $cloudflaredPath tunnel --config $resolvedConfigPath run
