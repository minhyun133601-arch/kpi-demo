param(
  [string]$Alias = 'kpi'
)

$ErrorActionPreference = 'Stop'

$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Error "Administrator privileges are required. Re-run this script in an elevated PowerShell window."
  exit 1
}

$current = Get-Content -Path $hostsPath -ErrorAction Stop
$next = $current | Where-Object {
  $line = $_.Trim()
  if (-not $line) { return $true }
  if ($line.StartsWith('#')) { return $true }
  return -not ($line -match "(^|\s)$([regex]::Escape($Alias))(\s|$)")
}

Set-Content -Path $hostsPath -Value $next -Encoding ASCII

Write-Host "Removed hosts alias:"
Write-Host "  $Alias"
