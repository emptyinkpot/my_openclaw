@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.local\openclaw"
set "CONFIG=%ROOT%\openclaw.json"
if not exist "%CONFIG%" (
  set "ROOT=%~dp0projects"
  set "CONFIG=%~dp0projects\openclaw.json"
)

set "LOCAL_CONFIG=%~dp0start-openclaw.local.bat"
set "LOCAL_CONFIG_EXAMPLE=%~dp0start-openclaw.local.example.bat"

if exist "%LOCAL_CONFIG%" call "%LOCAL_CONFIG%"

if not defined OPENCLAW_CONFIG_PATH set "OPENCLAW_CONFIG_PATH=%CONFIG%"

if not exist "%OPENCLAW_CONFIG_PATH%" (
  echo Missing config file: "%OPENCLAW_CONFIG_PATH%"
  echo.
  echo Restore the runtime files under "%~dp0.local\openclaw" or keep the UI under "%~dp0projects".
  pause
  exit /b 1
)

for %%I in ("%OPENCLAW_CONFIG_PATH%") do set "ROOT=%%~dpI"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

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
set "RUNTIME_LOG_DIR=%ROOT%\.runtime\logs"
if not exist "%RUNTIME_LOG_DIR%" mkdir "%RUNTIME_LOG_DIR%"
set "GATEWAY_LOG=%RUNTIME_LOG_DIR%\gateway-start.log"
set "STARTUP_STATE=%ROOT%\.runtime\state\gateway-startup.json"
set "FORCE_ARGS="
if /I "%OPENCLAW_FORCE_RESTART%"=="1" set "FORCE_ARGS=-ForceRestart"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\gateway\openclaw-gateway-run.ps1" -ConfigPath "%OPENCLAW_CONFIG_PATH%" -Token "%OPENCLAW_GATEWAY_TOKEN%" -Root "%ROOT%" -LogPath "%GATEWAY_LOG%" -StartPath "%OPENCLAW_START_PATH%" %FORCE_ARGS%
if errorlevel 1 (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$startupStatePath='%STARTUP_STATE%'; $port=5000; if (Test-Path -LiteralPath $startupStatePath) { try { $state = Get-Content -LiteralPath $startupStatePath -Raw | ConvertFrom-Json; if ($state.port) { $port = [int]$state.port } } catch {} }; try { $response = Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:' + $port + '/health') -TimeoutSec 5; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { exit 0 } } catch {}; exit 1"
  if not errorlevel 1 (
    echo Gateway is already healthy even though the launcher reported a warning.
    echo Startup state: "%STARTUP_STATE%"
    exit /b 0
  )

  echo Gateway did not finish starting.
  if exist "%STARTUP_STATE%" (
    echo Startup state: "%STARTUP_STATE%"
    type "%STARTUP_STATE%"
  )
  echo Check log: "%GATEWAY_LOG%"
  pause
  exit /b 1
)

echo.
echo OpenClaw is starting in the background. The browser will open automatically after the gateway is healthy.
echo Closing the launched browser window will stop the gateway automatically.
exit /b 0
