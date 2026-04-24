$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $serverDir 'src\scripts\one-shot\migrateMeteringBillingDocuments.js'

node $scriptPath @args
