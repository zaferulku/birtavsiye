# ============================================================================
# Birtavsiye scrape watchdog — Windows Task Scheduler kurulum script'i
# ============================================================================
# Computer logon olunca watchdog'u otomatik baslatir. Mevcut watchdog process
# varsa wrapper (start-watchdog.cmd) duplicate'i engeller.
#
# Kurulum (yonetici PowerShell gerekmez):
#   pwsh -ExecutionPolicy Bypass -File scripts\install-watchdog-task.ps1
#
# Kaldirmak icin:
#   Unregister-ScheduledTask -TaskName "BirtavsiyeScrapeWatchdog" -Confirm:$false
#
# Manuel test:
#   Start-ScheduledTask -TaskName "BirtavsiyeScrapeWatchdog"
#   Get-Content logs\watchdog.log -Tail 5
# ============================================================================

$taskName = "BirtavsiyeScrapeWatchdog"
$projectDir = "C:\projeler\birtavsiye"
$wrapperPath = Join-Path $projectDir "scripts\start-watchdog.cmd"

# Wrapper var mi kontrolu
if (-not (Test-Path $wrapperPath)) {
  Write-Error "Wrapper bulunamadi: $wrapperPath"
  exit 1
}

# Mevcut gorev varsa temizle (idempotent)
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Output "Mevcut gorev siliniyor..."
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Action: cmd wrapper'i calistir
$action = New-ScheduledTaskAction -Execute $wrapperPath -WorkingDirectory $projectDir

# Trigger: kullanici logon olur olmaz
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"

# Settings: gerekirse 5dk sonra retry, idle'da durmaz, sinirsiz exec time
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries

# Principal: kullanicinin kendi yetkisiyle
$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive `
  -RunLevel Limited

# Kayit
Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "birtavsiye PTT+MM scrape watchdog (logon trigger, sonsuz dongu)"

Write-Output ""
Write-Output "Kurulum tamam:"
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State | Format-Table

Write-Output "Manuel test icin:"
Write-Output "  Start-ScheduledTask -TaskName $taskName"
Write-Output ""
Write-Output "Bilgisayar restart sonrasi otomatik baslatilir. Log:"
Write-Output "  Get-Content $projectDir\logs\watchdog.log -Tail 10"
