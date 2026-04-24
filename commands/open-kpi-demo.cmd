@echo off
chcp 65001 >nul
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-kpi-demo-static.ps1"
set "STATUS_CODE=%ERRORLEVEL%"

if not "%STATUS_CODE%"=="0" (
  echo.
  echo KPI Demo failed to start.
  echo Press any key to close this window.
  pause >nul
)

endlocal & exit /b %STATUS_CODE%
