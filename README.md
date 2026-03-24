# OpenClaw Full UI Template

This branch is the full, portable OpenClaw workspace snapshot.

Clone this branch when you want the entire UI, plugins, docs, scripts, and workspace layout in one place.

## Quick Start

1. Clone the repository and checkout `codex/full-ui-template`.
2. Copy `start-openclaw.local.example.bat` to `start-openclaw.local.bat`.
3. Edit `start-openclaw.local.bat` and set your gateway token.
4. Double-click `start-openclaw.bat`.
5. Keep the gateway window open and use the browser tab it opens.

## What To Expect

- `start-openclaw.bat` launches the gateway from the current folder.
- `openclaw.json` in this branch is already wired to the local workspace layout.
- `control-ui-custom/` contains the browser UI entry points.
- `extensions/`, `docs/`, `scripts/`, `packages/`, and `workspace/` are present for the full workspace flow.

## Restore

If you need to repopulate the shell files from GitHub, run:

```powershell
.\restore-from-github.ps1 -Branch codex/full-ui-template
```

Use `-Branch main` if you only want the lightweight launcher shell.
