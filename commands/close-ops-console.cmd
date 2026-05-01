@echo off
chcp 65001 >nul
setlocal

set "APP_DIR="
for /d %%D in ("%~dp0*") do (
  if exist "%%~fD\scripts\stop-ops-console.ps1" (
    set "APP_DIR=%%~fD\"
  )
)
if not defined APP_DIR (
  echo Ops console app directory was not found.
  pause >nul
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%scripts\stop-ops-console.ps1"
set "STATUS_CODE=%ERRORLEVEL%"

echo.
echo Press any key to close this window.
pause >nul

endlocal & exit /b %STATUS_CODE%
