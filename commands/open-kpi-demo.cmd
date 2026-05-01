@echo off
chcp 65001 >nul
setlocal

set "COMMANDS_DIR=%~dp0"
set "STATIC_SCRIPT=%COMMANDS_DIR%internal\start-kpi-demo-static.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%STATIC_SCRIPT%"
set "STATUS_CODE=%ERRORLEVEL%"

if not "%STATUS_CODE%"=="0" (
  echo.
  echo KPI Demo failed to start.
  echo Press any key to close this window.
  pause >nul
)

endlocal & exit /b %STATUS_CODE%
