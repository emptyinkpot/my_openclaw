@echo off
setlocal EnableExtensions

rem One-click launcher: start Superset (web + api) and then OpenClaw with Superset as the first page.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "ROOT=%%~fI\"
set "ROOT_ARG=%ROOT:~0,-1%"
set "SUPERSET_RUNTIME=%SCRIPT_DIR%openclaw-superset-runtime.ps1"
set "SUPERSET_CONFIG=%SCRIPT_DIR%openclaw-superset.config.json"

if not exist "%SUPERSET_CONFIG%" (
  echo Missing config file: "%SUPERSET_CONFIG%"
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in (`powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SUPERSET_RUNTIME%" -Action emit-openclaw-env -Root "%ROOT_ARG%"`) do (
  if /I "%%A"=="OPENCLAW_START_PATH" set "OPENCLAW_START_PATH=%%B"
  if /I "%%A"=="SKIP_ENV_VALIDATION" set "SKIP_ENV_VALIDATION=%%B"
  if /I "%%A"=="OPENCLAW_SUPERSET_AUTO_STOP" set "OPENCLAW_SUPERSET_AUTO_STOP=%%B"
  if /I "%%A"=="OPENCLAW_CONFIG_PATH" set "OPENCLAW_CONFIG_PATH=%%B"
)

if not defined OPENCLAW_CONFIG_PATH (
  echo Failed to resolve OpenClaw environment from runtime config.
  exit /b 1
)

set "SUPERSET_REL_ROOT=projects\apps\superset.current"
set "SUPERSET_ROOT=%ROOT%%SUPERSET_REL_ROOT%"

if not exist "%SUPERSET_ROOT%\package.json" (
  set "SUPERSET_FALLBACK=%ROOT%projects\apps\superset"
  if exist "%SUPERSET_FALLBACK%\package.json" (
    echo Superset stable junction missing, creating %SUPERSET_ROOT% ...
    mklink /J "%SUPERSET_ROOT%" "%SUPERSET_FALLBACK%" >nul 2>nul
  )
)

if not exist "%SUPERSET_ROOT%\package.json" (
  echo WARN: Superset source not found: "%SUPERSET_ROOT%"
  echo WARN: OpenClaw will still start without local Superset runtime.
  goto :START_OPENCLAW
)

if not exist "%SUPERSET_RUNTIME%" (
  echo Missing runtime script: "%SUPERSET_RUNTIME%"
  exit /b 1
)

set "BUN_EXE="

where bun >nul 2>nul
if not errorlevel 1 set "BUN_EXE=bun"

if not defined BUN_EXE if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN_EXE=%USERPROFILE%\.bun\bin\bun.exe"

if not defined BUN_EXE (
  for /f "delims=" %%I in ('dir /b /s "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun*\*\bun.exe" 2^>nul') do (
    if not defined BUN_EXE set "BUN_EXE=%%~fI"
  )
)

if not defined BUN_EXE if exist "%LOCALAPPDATA%\Programs\bun\bun.exe" set "BUN_EXE=%LOCALAPPDATA%\Programs\bun\bun.exe"

if not defined BUN_EXE if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe" set "BUN_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe"

if not defined BUN_EXE if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun.Baseline_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64-baseline\bun.exe" set "BUN_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun.Baseline_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64-baseline\bun.exe"

if not defined BUN_EXE (
  echo WARN: Bun is not installed. Superset services will not start.
  echo WARN: OpenClaw will still start and open /superset/ ^(status page^), install Bun to enable full integration.
  goto :START_OPENCLAW
)

echo Starting Superset runtime manager...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SUPERSET_RUNTIME%" -Action start -Root "%ROOT_ARG%" -BunExe "%BUN_EXE%"
if errorlevel 1 (
  echo Superset startup failed, check logs:
  echo   "%ROOT%projects\.runtime\logs\superset-api.log"
  echo   "%ROOT%projects\.runtime\logs\superset-web.log"
  exit /b 1
)

:START_OPENCLAW
call "%ROOT%start-openclaw.bat"
if errorlevel 1 (
  echo OpenClaw gateway failed to start, rolling back Superset runtime...
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SUPERSET_RUNTIME%" -Action stop -Root "%ROOT_ARG%" >nul 2>nul
  exit /b 1
)

exit /b 0