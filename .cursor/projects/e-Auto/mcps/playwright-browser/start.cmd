@echo off
setlocal

set "TARGET_REPO=%ROO_TARGET_REPO%"
if not defined TARGET_REPO set "TARGET_REPO=%CD%"

set "PLAYWRIGHT_MCP=%ROO_PLAYWRIGHT_MCP%"
if not defined PLAYWRIGHT_MCP (
  for %%P in ("%TARGET_REPO%\projects\node_modules\playwright\lib\mcp\index.js" "%TARGET_REPO%\node_modules\playwright\lib\mcp\index.js") do (
    if not defined PLAYWRIGHT_MCP if exist "%%~fP" set "PLAYWRIGHT_MCP=%%~fP"
  )
)

if /I "%~1"=="--smoke" goto smoke

if not defined PLAYWRIGHT_MCP (
  echo [playwright-browser] missing playwright MCP entry.
  echo [playwright-browser] set ROO_PLAYWRIGHT_MCP or ROO_TARGET_REPO.
  exit /b 1
)

if not exist "%PLAYWRIGHT_MCP%" (
  echo [playwright-browser] missing: %PLAYWRIGHT_MCP%
  exit /b 1
)

node "%PLAYWRIGHT_MCP%" browser %*
exit /b %errorlevel%

:smoke
if defined PLAYWRIGHT_MCP if exist "%PLAYWRIGHT_MCP%" (
  echo [playwright-browser] smoke ok
  echo [playwright-browser] target_repo=%TARGET_REPO%
  echo [playwright-browser] entry=%PLAYWRIGHT_MCP%
  exit /b 0
)

echo [playwright-browser] smoke missing entry
echo [playwright-browser] target_repo=%TARGET_REPO%
echo [playwright-browser] entry=(unresolved)
exit /b 1
