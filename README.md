# OpenClaw Full UI Template

This branch is a portable snapshot of the full OpenClaw UI workspace.

## Start

1. Copy `start-openclaw.local.example.bat` to `start-openclaw.local.bat`.
2. Edit the token in the local file.
3. Run `start-openclaw.bat`.

## Restore

If you need to repopulate the layout files from GitHub, run:

```powershell
.\restore-from-github.ps1 -Branch main
```

Or point `-Branch` at this template branch if you want the same snapshot again.