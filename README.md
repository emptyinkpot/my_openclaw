# OpenClaw Launcher

This repository is the lightweight launcher shell for the OpenClaw workspace.

What is here:

- `start-openclaw.bat` for a native launcher window
- `openclaw-launcher-ui.ps1` for the Windows Forms launcher UI
- `restore-from-github.ps1` for restoring the shell files from GitHub
- `openclaw-gateway-run.ps1` and `openclaw-gateway-child.ps1` for the gateway startup flow
- `openclaw-bootstrap.html` for seeding the browser token before the UI loads
- `workspace/`, `skills/`, `usr/` and the instruction files used by the local agent
- local runtime data now lives under `.local/openclaw` and `.local/ollama`
- `start-openclaw.bat` now boots from `.local/openclaw` by default
- the launcher reuses a healthy gateway, otherwise it stops a stale scheduled task before starting a fresh one
- the original `C:\Users\ASUS-KL\.openclaw` and `C:\Users\ASUS-KL\.ollama` paths are junctions to that local store

How to start:

1. Put the full UI under `projects/`, or clone the `codex/full-ui-template` branch next to this shell.
2. Copy `start-openclaw.local.example.bat` to `start-openclaw.local.bat`.
3. Edit the token in `start-openclaw.local.bat`.
4. Double-click `start-openclaw.bat`.

The launcher window is native Windows UI. It only opens the browser control UI when you click `Open Control UI`.

If you want the full workspace snapshot instead of the shell, use the `codex/full-ui-template` branch.
