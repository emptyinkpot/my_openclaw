@echo off
setlocal
taskkill /IM msedge.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" exit /b 1
set "PROFILE=%~dp0.tmp\edge-debug-openclaw-verify-%RANDOM%%RANDOM%"
if not exist "%PROFILE%" mkdir "%PROFILE%" >nul 2>&1
set "BOOTSTRAP_PATH=%~dp0openclaw-bootstrap.html"
set "BOOTSTRAP_URI=%BOOTSTRAP_PATH:\=/%"
start "" "%EDGE%" --remote-debugging-port=9222 --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check --new-window "file:///%BOOTSTRAP_URI%?token=openclaw-local-20260324-9f3b7c1d5a2e4b6f&gatewayUrl=ws://127.0.0.1:5000"
exit /b 0

