# Diagnosis Rules

## Primary Inputs

- Codex config files
- Roo environment files
- VS Code global storage state
- Extension task history and logs

## Initial Rule Set

### Healthy

All active sources agree on provider, base URL, model, and key fingerprint.

### Drift Detected

At least one disk source and one runtime-related source disagree, but the data is still parseable.

### Stale Runtime

Disk state is newer than runtime-adjacent state and an older key fingerprint is still observed.

### Invalid Config

A required file is unreadable, malformed, missing mandatory fields, or resolves to an impossible provider combination.

### Auto Fixable

The diagnosis maps to a known repair action with bounded scope, backup support, and no destructive data loss.

### Manual Action Required

The drift spans multiple ambiguous sources or requires a risky operation such as task-history pruning or direct database edits.

## Rule Priorities

1. Invalid config overrides every lower-severity status.
2. Stale runtime overrides generic drift.
3. Manual action required overrides auto-fixable if multiple sources disagree in incompatible ways.
4. Healthy is emitted only when no rule violations remain.

## Evidence Requirements

Each diagnosis should capture:

- Source identifiers
- Redacted fingerprints
- Last modified timestamps when available
- Rule ids that fired
- Suggested next action
