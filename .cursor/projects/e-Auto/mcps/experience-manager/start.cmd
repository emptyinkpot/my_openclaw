@echo off
setlocal

set "TARGET_REPO=%ROO_TARGET_REPO%"
if not defined TARGET_REPO set "TARGET_REPO=%CD%"

set "ENTRY=%ROO_EXPERIENCE_MANAGER_MCP%"
if not defined ENTRY set "ENTRY=%TARGET_REPO%\projects\extensions\experience-manager\mcp\experience-manager-mcp.mjs"
if not exist "%ENTRY%" if not defined ROO_EXPERIENCE_MANAGER_MCP set "ENTRY=%TARGET_REPO%\extensions\experience-manager\mcp\experience-manager-mcp.mjs"

if /I "%~1"=="--help" goto help
if /I "%~1"=="--smoke" goto smoke

if not exist "%ENTRY%" (
  echo [experience-manager] missing entry: %ENTRY%
  echo [experience-manager] set ROO_EXPERIENCE_MANAGER_MCP or ROO_TARGET_REPO.
  exit /b 1
)

node "%ENTRY%" %*
exit /b %errorlevel%

:smoke
if exist "%ENTRY%" (
  echo [experience-manager] smoke ok
  echo [experience-manager] target_repo=%TARGET_REPO%
  echo [experience-manager] entry=%ENTRY%
  exit /b 0
)

echo [experience-manager] smoke missing entry
echo [experience-manager] target_repo=%TARGET_REPO%
echo [experience-manager] entry=(unresolved)
exit /b 1

:help
echo usage: start.cmd [--smoke ^| --help]
exit /b 0
