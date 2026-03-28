@echo off
setlocal

set "TARGET_REPO=%ROO_TARGET_REPO%"
if not defined TARGET_REPO set "TARGET_REPO=%CD%"

if /I "%~1"=="--smoke" goto smoke
if /I "%~1"=="--help" goto help

echo [repo-inspector] mode=default
echo [repo-inspector] target_repo=%TARGET_REPO%

git -C "%TARGET_REPO%" status --short
if errorlevel 1 exit /b 1

git -C "%TARGET_REPO%" diff --shortstat
if errorlevel 1 exit /b 1

exit /b 0

:smoke
echo [repo-inspector] mode=smoke
echo [repo-inspector] target_repo=%TARGET_REPO%

git -C "%TARGET_REPO%" rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [repo-inspector] target is not a git worktree
  exit /b 1
)

echo --- git status --short ---
git -C "%TARGET_REPO%" status --short
echo --- git diff --shortstat ---
git -C "%TARGET_REPO%" diff --shortstat
exit /b 0

:help
echo usage: start.cmd [--smoke ^| --help]
exit /b 0
