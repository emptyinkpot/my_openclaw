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
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0openclaw-gateway-run.ps1" -ConfigPath "%OPENCLAW_CONFIG_PATH%" -Token "%OPENCLAW_GATEWAY_TOKEN%" -Root "%ROOT%" -LogPath "%GATEWAY_LOG%"
if errorlevel 1 (
  echo Gateway did not start on 127.0.0.1:5000.
  pause
  exit /b 1
)

echo.
echo OpenClaw is starting. Keep the gateway window open.
exit /b 0
