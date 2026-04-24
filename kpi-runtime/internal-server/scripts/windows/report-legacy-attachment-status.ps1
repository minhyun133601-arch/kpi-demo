$ErrorActionPreference = 'Stop'

$serverDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$scriptPath = Join-Path $serverDir 'src\scripts\reportLegacyAttachmentStatus.js'

node $scriptPath @args
