@echo off
setlocal

set "TARGET_REPO=%ROO_TARGET_REPO%"
if not defined TARGET_REPO set "TARGET_REPO=%CD%"
set "ARG=%~1"

if /I "%ARG%"=="--help" goto :help
if /I "%ARG%"=="--smoke" goto :smoke

echo [log-diagnose] scanning common files for error patterns...
echo [log-diagnose] target_repo=%TARGET_REPO%
call :scan "openclaw-gateway-run.ps1"
call :scan "openclaw-gateway-child.ps1"
call :scan "start-openclaw-admin.ps1"
call :scan "start-openclaw.bat"
echo [log-diagnose] done
exit /b 0

:help
echo usage: start.cmd [--smoke ^| --help]
exit /b 0

:smoke
echo [log-diagnose] mode=smoke
echo [log-diagnose] target_repo=%TARGET_REPO%
call :exists "openclaw-gateway-run.ps1"
call :exists "openclaw-gateway-child.ps1"
call :exists "start-openclaw-admin.ps1"
call :exists "start-openclaw.bat"
exit /b 0

:exists
if exist "%TARGET_REPO%\%~1" (
  echo [log-diagnose] found %~1
) else (
  echo [log-diagnose] missing %~1
)
exit /b 0

:scan
set "TARGET=%~1"
set "FULL=%TARGET_REPO%\%TARGET%"
if not exist "%FULL%" (
  echo [log-diagnose] skip missing: %TARGET%
  exit /b 0
)
echo --- %TARGET% ---
findstr /n /i /c:"error" /c:"exception" /c:"failed" /c:"fatal" "%FULL%"
if errorlevel 1 echo [log-diagnose] no keyword hits in %TARGET%
exit /b 0
