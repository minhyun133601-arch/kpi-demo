$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Push-Location $serverDir
try {
  node src/scripts/pruneExpiredSessions.js
} finally {
  Pop-Location
}
