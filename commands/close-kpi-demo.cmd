@echo off
chcp 65001 >nul
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-kpi-demo-static.ps1"
set "STATUS_CODE=%ERRORLEVEL%"

echo.
echo Press any key to close this window.
pause >nul

endlocal & exit /b %STATUS_CODE%
