@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..\..") do set "ROOT=%%~fI\"
set "ROOT_ARG=%ROOT:~0,-1%"
set "SUPERSET_RUNTIME=%SCRIPT_DIR%openclaw-superset-runtime.ps1"
set "PROJECTS_ROOT=%ROOT%projects"

echo Stopping OpenClaw gateway...
pushd "%PROJECTS_ROOT%" >nul 2>nul
if not errorlevel 1 (
  openclaw gateway stop >nul 2>nul
  popd >nul 2>nul
)

if exist "%SUPERSET_RUNTIME%" (
  echo Stopping Superset runtime...
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SUPERSET_RUNTIME%" -Action stop -Root "%ROOT_ARG%" >nul 2>nul
)

echo OpenClaw + Superset stop sequence finished.
exit /b 0
