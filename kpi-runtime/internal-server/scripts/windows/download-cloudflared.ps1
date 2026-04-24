param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$targetDir = Join-Path $serverDir 'var\central-runtime\tools\cloudflared'
$targetPath = Join-Path $targetDir 'cloudflared.exe'
$downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

if ((Test-Path $targetPath) -and -not $Force) {
  Write-Host "cloudflared is already present: $targetPath"
  & $targetPath --version
  exit 0
}

Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath
& $targetPath --version

Write-Host "Downloaded cloudflared to $targetPath"
