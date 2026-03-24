@echo off
setlocal EnableExtensions

echo Starting OpenClaw launcher UI...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0openclaw-launcher-ui.ps1"
if errorlevel 1 (
  echo OpenClaw launcher UI failed to start.
  pause
  exit /b 1
)

echo.
echo OpenClaw launcher UI is running.
exit /b 0
