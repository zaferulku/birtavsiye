@echo off
REM ========================================================================
REM Windows Task Scheduler entrypoint icin watchdog wrapper.
REM Logon trigger ile her oturum acilisinda baslar.
REM
REM Manuel test:
REM   cmd /c scripts\start-watchdog.cmd
REM ========================================================================

cd /d "C:\projeler\birtavsiye"

REM Watchdog zaten calisiyor mu kontrolu (cifte instance engelle)
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv /nh ^| findstr /i "scrape-watchdog"') do (
  echo Watchdog zaten calisiyor PID=%%i, exit.
  exit /b 0
)

echo [%date% %time%] Watchdog baslatiliyor... >> logs\watchdog.log
node scripts\scrape-watchdog.mjs >> logs\watchdog.log 2>&1
echo [%date% %time%] Watchdog cikti exit=%ERRORLEVEL% >> logs\watchdog.log
