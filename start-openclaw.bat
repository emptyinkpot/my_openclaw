@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.local\openclaw"
set "CONFIG=%ROOT%\openclaw.json"
if not exist "%CONFIG%" (
  set "ROOT=%~dp0projects"
  set "CONFIG=%ROOT%\openclaw.json"
)
set "LOCAL_CONFIG=%~dp0start-openclaw.local.bat"
set "LOCAL_CONFIG_EXAMPLE=%~dp0start-openclaw.local.example.bat"

if exist "%LOCAL_CONFIG%" call "%LOCAL_CONFIG%"

if not defined OPENCLAW_CONFIG_PATH set "OPENCLAW_CONFIG_PATH=%CONFIG%"

if not exist "%CONFIG%" (
  echo Missing config file: "%CONFIG%"
  echo.
  echo Restore the runtime files under "%~dp0.local\openclaw" or copy the full UI into "%~dp0projects".
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
set "GATEWAY_LOG=%ROOT%\gateway-start.log"
start "OpenClaw Gateway" /D "%ROOT%" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$env:OPENCLAW_CONFIG_PATH='%OPENCLAW_CONFIG_PATH%'; $env:OPENCLAW_GATEWAY_TOKEN='%OPENCLAW_GATEWAY_TOKEN%'; Set-Location -LiteralPath '%ROOT%'; openclaw gateway --port 5000 --force --token '%OPENCLAW_GATEWAY_TOKEN%' *> '%GATEWAY_LOG%'"

echo Waiting for port 5000...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 90; $i++) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port 5000 -InformationLevel Quiet) { exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo Gateway did not start on 127.0.0.1:5000.
  pause
  exit /b 1
)

echo Opening browser UI...
set "BROWSER_URL=file:///E:/Auto/openclaw-bootstrap.html?token=%OPENCLAW_GATEWAY_TOKEN%&gatewayUrl=ws://127.0.0.1:5000"
set "EDGE_EXE="
for %%P in (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do (
  if not defined EDGE_EXE if exist "%%~P" set "EDGE_EXE=%%~P"
)
if defined EDGE_EXE (
  set "EDGE_PROFILE=%~dp0.local\edge-openclaw-fresh"
  if not exist "%EDGE_PROFILE%" mkdir "%EDGE_PROFILE%" >nul 2>&1
  start "" "%EDGE_EXE%" --new-window --no-first-run --no-default-browser-check --user-data-dir="%EDGE_PROFILE%" "%BROWSER_URL%"
) else (
  start "" "%BROWSER_URL%"
)

echo.
echo OpenClaw is starting. Keep the gateway window open.
exit /b 0
