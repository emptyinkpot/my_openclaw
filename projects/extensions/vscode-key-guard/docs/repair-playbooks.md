# Repair Playbooks

## Purpose

This document defines the first safe repair playbooks for `vscode-key-guard`.

All repairs must be evidence-first, backup-first, and redact secrets in every audit record.

## Playbook 1: Reset Active Roo Config Name

### Use When

- Roo disk config is correct.
- VS Code state points at an older config name.
- The mismatch is isolated and clearly reversible.

### Steps

1. Capture current state snapshot.
2. Backup the target state file or record.
3. Write the expected active config name.
4. Append an audit event with before/after fingerprints.
5. Mark runtime restart as recommended.

## Playbook 2: Rebuild Standard Config Projection

### Use When

- Canonical config exists in the approved source.
- Derived files are missing, partial, or stale.
- Repair does not destroy user-authored unrelated settings.

### Steps

1. Load canonical source.
2. Validate required fields.
3. Backup target files.
4. Rewrite only managed keys.
5. Re-scan and confirm the diagnosis improves.

## Playbook 3: Guarded Runtime Restart Request

### Use When

- Disk state is correct.
- Runtime remains stale after state alignment.
- No safe direct mutation exists.

### Steps

1. Persist evidence of stale runtime.
2. Emit a restart-required event.
3. Optionally call a local helper script for extension-host restart.
4. Re-run diagnosis after restart completes.

## Explicitly Out of Scope for Auto Repair

- Blindly deleting all task history
- Writing raw API keys into logs
- Editing ambiguous sources without a canonical winner
- Modifying unknown extensions or non-whitelisted files
