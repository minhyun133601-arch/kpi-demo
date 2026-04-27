@echo off
chcp 65001 >nul
setlocal

set "COMMANDS_DIR=%~dp0"
set "OPS_SCRIPT=%COMMANDS_DIR%ops-console-app\scripts\start-ops-console.ps1"
set "STATIC_SCRIPT=%COMMANDS_DIR%internal\start-kpi-demo-static.ps1"
set "OPS_STATUS=0"

if not exist "%OPS_SCRIPT%" goto startStaticDemo

powershell -NoProfile -ExecutionPolicy Bypass -File "%OPS_SCRIPT%" -NoOpen
set "OPS_STATUS=%ERRORLEVEL%"
if "%OPS_STATUS%"=="0" goto startStaticDemo

echo.
echo KPI Demo operations console failed to start. Static demo will still open.

:startStaticDemo
powershell -NoProfile -ExecutionPolicy Bypass -File "%STATIC_SCRIPT%"
set "STATUS_CODE=%ERRORLEVEL%"

if not "%STATUS_CODE%"=="0" (
  echo.
  echo KPI Demo failed to start.
  echo Press any key to close this window.
  pause >nul
)

if "%STATUS_CODE%"=="0" if not "%OPS_STATUS%"=="0" (
  echo.
  echo KPI Demo opened, but the operations console is unavailable.
  echo Press any key to close this window.
  pause >nul
)

endlocal & exit /b %STATUS_CODE%
