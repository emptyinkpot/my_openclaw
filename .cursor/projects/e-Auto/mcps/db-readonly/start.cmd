@echo off
setlocal

set "TARGET_REPO=%ROO_TARGET_REPO%"
if not defined TARGET_REPO set "TARGET_REPO=%CD%"

if /I "%~1"=="--help" goto help
if /I "%~1"=="--smoke" goto smoke

echo [db-readonly] mode=default
echo [db-readonly] target_repo=%TARGET_REPO%

git -C "%TARGET_REPO%" rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [db-readonly] target is not a git worktree
  exit /b 1
)

echo --- candidate db-related files (read-only probe) ---
git -C "%TARGET_REPO%" ls-files | findstr /i "db sqlite prisma schema migration" 
if errorlevel 1 echo [db-readonly] no db-related tracked files matched keywords

exit /b 0

:smoke
echo [db-readonly] mode=smoke
echo [db-readonly] target_repo=%TARGET_REPO%

git -C "%TARGET_REPO%" rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [db-readonly] target is not a git worktree
  exit /b 1
)

echo [db-readonly] smoke ok
exit /b 0

:help
echo usage: start.cmd [--smoke ^| --help]
exit /b 0
