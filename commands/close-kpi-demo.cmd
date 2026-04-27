@echo off
chcp 65001 >nul
setlocal

set "COMMANDS_DIR=%~dp0"
set "STATIC_SCRIPT=%COMMANDS_DIR%internal\stop-kpi-demo-static.ps1"
set "OPS_SCRIPT=%COMMANDS_DIR%ops-console-app\scripts\stop-ops-console.ps1"
set "STATUS_CODE=0"
set "OPS_STATUS=0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%STATIC_SCRIPT%"
set "STATIC_STATUS=%ERRORLEVEL%"
if not "%STATIC_STATUS%"=="0" set "STATUS_CODE=%STATIC_STATUS%"

if exist "%OPS_SCRIPT%" powershell -NoProfile -ExecutionPolicy Bypass -File "%OPS_SCRIPT%"
if exist "%OPS_SCRIPT%" set "OPS_STATUS=%ERRORLEVEL%"
if not "%OPS_STATUS%"=="0" if "%STATUS_CODE%"=="0" set "STATUS_CODE=%OPS_STATUS%"

echo.
echo Press any key to close this window.
pause >nul

endlocal & exit /b %STATUS_CODE%
