param(
  [string]$TimeText,
  [string]$DefaultTime = '22:00',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

function Get-BootTime {
  $bootValue = (Get-CimInstance -ClassName Win32_OperatingSystem).LastBootUpTime
  if ($bootValue -is [datetime]) {
    return $bootValue
  }

  $bootText = [string]$bootValue
  return [System.Management.ManagementDateTimeConverter]::ToDateTime($bootText)
}

function Read-ShutdownTimeText {
  param(
    [string]$DefaultValue
  )

  if (-not [string]::IsNullOrWhiteSpace($TimeText)) {
    return $TimeText.Trim()
  }

  $inputValue = Read-Host ("Shutdown time (24h HH:mm, Enter={0})" -f $DefaultValue)
  if ([string]::IsNullOrWhiteSpace($inputValue)) {
    return $DefaultValue
  }

  return $inputValue.Trim()
}

function Convert-ToTargetDateTime {
  param(
    [string]$Value,
    [datetime]$Now
  )

  $parsedTime = [datetime]::MinValue
  if (-not [datetime]::TryParseExact($Value, 'HH:mm', $null, [System.Globalization.DateTimeStyles]::None, [ref]$parsedTime)) {
    throw "Invalid time format. Use HH:mm such as 22:00."
  }

  $target = Get-Date -Year $Now.Year -Month $Now.Month -Day $Now.Day -Hour $parsedTime.Hour -Minute $parsedTime.Minute -Second 0
  if ($target -le $Now) {
    $target = $target.AddDays(1)
  }

  return $target
}

$now = Get-Date
$bootTime = Get-BootTime
$timeInput = Read-ShutdownTimeText -DefaultValue $DefaultTime
$targetTime = Convert-ToTargetDateTime -Value $timeInput -Now $now
$secondsUntilShutdown = [int][Math]::Ceiling(($targetTime - $now).TotalSeconds)

Write-Host ("CURRENT_TIME={0}" -f $now.ToString('yyyy-MM-dd HH:mm:ss'))
Write-Host ("BOOT_TIME={0}" -f $bootTime.ToString('yyyy-MM-dd HH:mm:ss'))
Write-Host ("SCHEDULED_SHUTDOWN={0}" -f $targetTime.ToString('yyyy-MM-dd HH:mm:ss'))
Write-Host ("SECONDS_UNTIL_SHUTDOWN={0}" -f $secondsUntilShutdown)

if ($DryRun) {
  Write-Host 'DRY_RUN=shutdown command was not executed.'
  exit 0
}

$abortProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'shutdown.exe /a >nul 2>&1' -NoNewWindow -Wait -PassThru
if ($abortProcess.ExitCode -notin @(0, 1116)) {
  throw ("Failed to clear the existing shutdown schedule. ExitCode={0}" -f $abortProcess.ExitCode)
}

$shutdownProcess = Start-Process -FilePath 'shutdown.exe' -ArgumentList @('/s', '/t', $secondsUntilShutdown) -NoNewWindow -Wait -PassThru
if ($shutdownProcess.ExitCode -ne 0) {
  throw 'Failed to schedule the computer shutdown.'
}

Write-Host
Write-Host 'COMPUTER SHUTDOWN SCHEDULED'
Write-Host 'To cancel, run shutdown /a in Command Prompt or PowerShell.'
