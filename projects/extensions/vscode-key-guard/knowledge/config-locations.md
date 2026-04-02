# Config Locations

This file records the corrected source-of-truth map for `vscode-key-guard`.

## Codex

### Canonical writable files

- `C:\Users\ASUS-KL\.codex\auth.json`
- `C:\Users\ASUS-KL\.codex\config.toml`

### Meaning

- `auth.json` carries the active auth secret.
- `config.toml` carries provider, base URL, model, and related runtime settings.

## Roo

### Active selector and non-secret metadata

- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\state.vscdb`

Relevant row:

- `ItemTable.key = "RooVeterinaryInc.roo-cline"`

Typical fields of interest:

- `currentApiConfigName`
- `listApiConfigMeta`
- `apiProvider`
- `openAiBaseUrl`
- `openAiModelId`

### Active secret storage

- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\state.vscdb`

Relevant secret rows:

- `secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"openAiApiKey"}`
- `secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"roo_cline_config_api_config"}`

Important notes:

- these rows are encrypted
- presence can be probed from SQLite
- full read/write requires a VS Code or Electron-backed Secret bridge
- direct plain-text file edits are not sufficient

### Runtime evidence

- `C:\Users\ASUS-KL\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline\tasks\_index.json`

This file can reveal:

- the current workspace binding
- `apiConfigName`
- mode and task history metadata

It is runtime evidence, not the canonical secret source.

### Candidate-only Roo files

- `C:\Users\ASUS-KL\.roo\.env.local`

This file may still be useful for:

- import
- comparison
- historical recovery

It must not be treated as the active Roo truth source on this machine.

## Backup Targets Before Any Roo Mutation

- `state.vscdb`
- `rooveterinaryinc.roo-cline\tasks\_index.json`
- related Roo storage files under `rooveterinaryinc.roo-cline`
- original Roo SecretStorage blobs

## Operational Summary

- Codex: direct file-backed read/write is valid.
- Roo active metadata: read from `state.vscdb`.
- Roo active secrets: bridge-required.
- Roo runtime drift: inspect `tasks/_index.json`.
- `.roo/.env.local`: candidate-only.
