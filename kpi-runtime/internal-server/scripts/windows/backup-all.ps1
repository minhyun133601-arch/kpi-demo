$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$postgresDumpScript = Join-Path $scriptDir 'backup-postgres-dump.ps1'
$runtimeBackupScript = Join-Path $scriptDir 'backup-runtime-snapshot.ps1'
$fileBackupScript = Join-Path $scriptDir 'backup-file-storage.ps1'

$postgresDumpRaw = & $postgresDumpScript
$postgresDumpSummary = $postgresDumpRaw | ConvertFrom-Json

$runtimeRaw = & $runtimeBackupScript
$runtimeSummary = $runtimeRaw | ConvertFrom-Json

$fileRaw = & $fileBackupScript
$fileSummary = $fileRaw | ConvertFrom-Json

[ordered]@{
  ok = $true
  postgresDump = $postgresDumpSummary
  runtimeSnapshot = $runtimeSummary
  fileStorage = $fileSummary
} | ConvertTo-Json -Depth 8
