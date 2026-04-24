param(
  [string]$ServerIp = '192.168.0.2',
  [string]$Alias = 'kpi'
)

$ErrorActionPreference = 'Stop'

$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$entry = "$ServerIp`t$Alias"

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Error "Administrator privileges are required. Re-run this script in an elevated PowerShell window."
  exit 1
}

$current = Get-Content -Path $hostsPath -ErrorAction Stop
$filtered = $current | Where-Object {
  $line = $_.Trim()
  if (-not $line) { return $true }
  if ($line.StartsWith('#')) { return $true }
  return -not ($line -match "(^|\s)$([regex]::Escape($Alias))(\s|$)")
}

$next = @(
  $filtered
  ''
  "# KPI demo runtime alias"
  $entry
) | Select-Object -Unique

Set-Content -Path $hostsPath -Value $next -Encoding ASCII

Write-Host "Added hosts alias:"
Write-Host "  $Alias -> $ServerIp"
Write-Host "Share URL: http://$Alias`:3100/"
