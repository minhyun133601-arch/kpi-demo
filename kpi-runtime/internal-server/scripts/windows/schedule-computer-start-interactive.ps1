param(
  [string]$TimeText,
  [string]$DefaultTime = '08:30',
  [int]$DelaySeconds = 20,
  [string]$TaskName = 'KPI Demo Runtime Scheduled Start',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

function Read-StartTimeText {
  param([string]$DefaultValue)

  if (-not [string]::IsNullOrWhiteSpace($TimeText)) {
    return $TimeText.Trim()
  }

  $inputValue = Read-Host ("Start time (24h HH:mm, Enter={0})" -f $DefaultValue)
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
    throw "Invalid time format. Use HH:mm such as 08:30."
  }

  $target = Get-Date -Year $Now.Year -Month $Now.Month -Day $Now.Day -Hour $parsedTime.Hour -Minute $parsedTime.Minute -Second 0
  if ($target -le $Now) {
    $target = $target.AddDays(1)
  }

  return $target
}

$now = Get-Date
$timeInput = Read-StartTimeText -DefaultValue $DefaultTime
$targetTime = Convert-ToTargetDateTime -Value $timeInput -Now $now
$startupScriptPath = (Resolve-Path (Join-Path $PSScriptRoot 'start-central-stack.startup.ps1')).Path
$argumentList = "-NoProfile -ExecutionPolicy Bypass -File `"$startupScriptPath`" -DelaySeconds $DelaySeconds"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host ("CURRENT_TIME={0}" -f $now.ToString('yyyy-MM-dd HH:mm:ss'))
Write-Host ("SCHEDULED_START={0}" -f $targetTime.ToString('yyyy-MM-dd HH:mm:ss'))
Write-Host ("TASK_NAME={0}" -f $TaskName)
Write-Host ("TASK_CONTEXT={0}" -f $currentUser)
Write-Host ("ACTION=powershell.exe {0}" -f $argumentList)
Write-Host 'START_MODE=Wake timer + current-user scheduled task'
Write-Host 'NOTE=Full power-on from complete shutdown depends on BIOS/UEFI RTC alarm or Wake-on-LAN.'

if ($DryRun) {
  Write-Host 'DRY_RUN=scheduled task was not registered.'
  exit 0
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentList
$trigger = New-ScheduledTaskTrigger -Once -At $targetTime
$settings = New-ScheduledTaskSettingsSet `
  -WakeToRun `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Wakes the computer when possible and starts the KPI demo runtime stack at the scheduled time for the current user session.' `
  -Force | Out-Null

Write-Host
Write-Host 'COMPUTER START SCHEDULED'
Write-Host 'Wake from sleep/hibernate is supported when the system allows wake timers.'
