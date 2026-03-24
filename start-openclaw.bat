@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "CONFIG=%ROOT%openclaw.json"
set "LOCAL_CONFIG=%~dp0start-openclaw.local.bat"
set "LOCAL_CONFIG_EXAMPLE=%~dp0start-openclaw.local.example.bat"

if exist "%LOCAL_CONFIG%" call "%LOCAL_CONFIG%"

if not defined OPENCLAW_CONFIG_PATH set "OPENCLAW_CONFIG_PATH=%CONFIG%"

if not exist "%CONFIG%" (
  echo Missing config file: "%CONFIG%"
  pause
  exit /b 1
)

if not defined OPENCLAW_GATEWAY_TOKEN (
  echo OPENCLAW_GATEWAY_TOKEN is not set.
  if exist "%LOCAL_CONFIG_EXAMPLE%" (
    echo Edit "%LOCAL_CONFIG%" first, or enter a token now.
  ) else (
    echo You can create "%LOCAL_CONFIG%" to keep the token local.
  )
  set /p OPENCLAW_GATEWAY_TOKEN=Enter OpenClaw gateway token:
)

if not defined OPENCLAW_GATEWAY_TOKEN (
  echo No token provided.
  pause
  exit /b 1
)

echo Starting OpenClaw gateway...
start "OpenClaw Gateway" /D "%ROOT%" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$env:OPENCLAW_CONFIG_PATH='%OPENCLAW_CONFIG_PATH%'; $env:OPENCLAW_GATEWAY_TOKEN='%OPENCLAW_GATEWAY_TOKEN%'; Set-Location -LiteralPath '%ROOT%'; openclaw gateway --port 5000 --force --token '%OPENCLAW_GATEWAY_TOKEN%'"

echo Waiting for port 5000...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 90; $i++) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port 5000 -InformationLevel Quiet) { exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo Gateway did not start on 127.0.0.1:5000.
  pause
  exit /b 1
)

echo Opening browser UI...
start "" "http://127.0.0.1:5000/#token=%OPENCLAW_GATEWAY_TOKEN%"

echo.
echo OpenClaw is starting. Keep the gateway window open.
exit /b 0