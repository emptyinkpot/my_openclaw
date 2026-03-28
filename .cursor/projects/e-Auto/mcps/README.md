# Roo MCP launcher configs

These are decoupled launcher scripts for Roo MCP wrappers.

## Design

- No hardcoded `E:\Auto` path in launcher logic.
- Env-first target repo resolution:
  - `ROO_TARGET_REPO` has highest priority.
  - Fallback to `%CD%` when env var is not set.
- Optional explicit Playwright MCP path:
  - `ROO_PLAYWRIGHT_MCP`

## Files

- `playwright-browser/start.cmd`
- `repo-inspector/start.cmd`
- `log-diagnose/start.cmd`

## Example smoke usage

```cmd
set "ROO_TARGET_REPO=E:\Auto"
C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\playwright-browser\start.cmd --smoke
C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\repo-inspector\start.cmd --smoke
C:\Users\ASUS-KL\.cursor\projects\e-Auto\mcps\log-diagnose\start.cmd --smoke
```
