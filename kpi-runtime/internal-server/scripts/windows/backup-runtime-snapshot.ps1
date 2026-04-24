$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $serverDir 'src\scripts\backupRuntimeSnapshot.js'

node $scriptPath @args
