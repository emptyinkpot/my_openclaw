# Config Locations

## Codex

Expected initial config sources on this machine:

- `C:/Users/ASUS-KL/.codex/config.toml`
- `C:/Users/ASUS-KL/.codex/auth.json`

## Roo Code

Expected initial config sources on this machine:

- `C:/Users/ASUS-KL/.roo/.env.local`
- `C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/state.vscdb`
- Roo extension-specific storage under VS Code global storage

## VS Code Runtime Context

Potential evidence sources:

- Extension host logs
- Resumed task metadata
- Provider selection state
- Managed local helper scripts

## Handling Rules

- Treat disk config as evidence, not automatic truth.
- Runtime state must be compared, not assumed.
- Secret values must be redacted into fingerprints before persistence.
