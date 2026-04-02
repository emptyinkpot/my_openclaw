# Known Issues

## Current Roo Constraints

- Roo active secrets on this machine are stored as encrypted VS Code SecretStorage rows inside `state.vscdb`.
- `.roo/.env.local` is not a reliable source of truth for the active Roo session.
- Roo task restore state can drift from `currentApiConfigName` in the Roo global-state row.
- Windows bridge support now exists, but it is machine-specific and depends on `Local State` + DPAPI remaining available.
- Current residual risk is task-index drift, not inability to read the active Roo secret.

## Current VS Code Risks

- VS Code may continue using stale in-memory state after a disk or SecretStorage change.
- Global state replay can silently restore an older active profile.
- Task history can reintroduce outdated Roo config bindings during resume.
- Direct `state.vscdb` edits are high risk without backup and a verified write path.

## First Mitigations

- Keep diagnosis read-first and evidence-first.
- Back up every mutable target before writing.
- Store only redacted evidence in local state.
- Treat Roo SecretStorage as a separate security boundary.
- Do not report Roo switch success unless the encrypted secret path was truly updated.
