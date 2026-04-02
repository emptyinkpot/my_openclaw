# Architecture

## Overview

`vscode-key-guard` follows the corrected source-of-truth model from the Roo/Codex local operations notes:

- Codex active auth is file-backed.
- Roo active profile selection and non-secret metadata live in `state.vscdb`.
- Roo active secrets live in encrypted VS Code SecretStorage rows inside the same `state.vscdb`.
- Roo task history is runtime evidence, not the canonical secret source.
- `.roo/.env.local` is candidate-only input and must not be treated as the active Roo truth source.

On this Windows machine, Roo mutation now happens through a real Secret bridge instead of through candidate files.

## Snapshot Sources

### Codex

- `C:\Users\ASUS-KL\.codex\auth.json`
- `C:\Users\ASUS-KL\.codex\config.toml`

### Roo active metadata

- `state.vscdb` row `ItemTable.key = "RooVeterinaryInc.roo-cline"`

### Roo active secrets

- `state.vscdb` SecretStorage rows for `openAiApiKey`
- `state.vscdb` SecretStorage rows for `roo_cline_config_api_config`

### Roo runtime evidence

- `rooveterinaryinc.roo-cline\tasks\_index.json`

### Roo candidate files

- `.roo/.env.local`

Candidate files may still be worth importing or comparing, but they are not authoritative for the active Roo session on this machine.

## Flow

1. Collect snapshots from Codex files, VS Code state, Roo SecretStorage probes, and Roo runtime evidence.
2. Normalize the snapshots into shared provider-aware types.
3. Run diagnosis rules that compare Codex file truth and Roo active-state truth separately.
4. Persist redacted evidence and audit events.
5. Expose the result through backend APIs and the guarded dashboard.

## Layers

### Core

Shared types, diagnosis evidence contracts, redaction helpers, and repair action models.

### Backend

Snapshot readers, diagnosis logic, provider status projection, audit logging, usage adapters, and guarded switch routes.

### Frontend

A status surface for snapshots, diagnosis, drift evidence, and controlled switch workflows.

### Runtime State

Redacted local state, usage cache, backups, and switch history under `.runtime/extensions/vscode-key-guard`.

## Write Policy

### Codex

Codex writes are enabled because the project has identified stable writable truth sources:

- `auth.json`
- `config.toml`

### Roo

Roo writes are supported through a Windows-specific Secret bridge.

The bridge:

1. Reads the VS Code `Local State` master-key envelope.
2. Uses the current Windows user context to unwrap the master key through DPAPI.
3. Decrypts and re-encrypts Roo `v10` SecretStorage payloads with AES-GCM.
4. Writes the updated secret blobs back into `state.vscdb`.
5. Backs up `state.vscdb`, Roo state files, and original secret blobs before mutation.

The backend must still never present `.roo/.env.local` edits as a real Roo switch.

## Safety Model

- Never expose raw API keys in logs, responses, or rendered pages.
- Preserve runtime-vs-disk mismatches as evidence before any mutation.
- Require backup-first behavior for every writable path.
- Treat encrypted SecretStorage as a separate security boundary.
- Fail closed if the Windows Secret bridge becomes unavailable.

## Baseline File Roles

- `backend/routes`: HTTP entry points for snapshots, diagnosis, repair, providers, usage, and switch.
- `backend/services`: snapshot readers, diagnosis logic, registry management, usage sync, Secret bridge logic, and guarded writes.
- `core/types`: shared TypeScript contracts.
- `frontend/pages/vscode-key-guard`: dashboard shell.
- `knowledge/config-locations.md`: machine-specific source-of-truth map.
- `.runtime/extensions/vscode-key-guard/state/latest.json`: latest redacted snapshot bundle.
- `.runtime/extensions/vscode-key-guard/state/history`: append-only diagnosis and switch records.
