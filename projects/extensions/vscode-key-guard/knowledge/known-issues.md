# Known Issues

## Initial Risks

- VS Code extension runtime may continue using stale keys after disk config changes.
- Active provider selection can silently revert through global state replay.
- Resumed task history can reintroduce old config bindings.
- Direct edits to VS Code storage can be high risk without a rollback path.

## First Mitigations

- Prefer read-only diagnosis before enabling any repair.
- Backup every mutable target before writing.
- Store only redacted evidence in local state.
- Require explicit rule matches before applying a repair playbook.
