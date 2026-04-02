# Diagnosis Rules

## Primary Inputs

### Required active-state inputs

- `codex-auth-json`
- `codex-config-toml`
- `vscode-roo-state-db`
- `vscode-roo-secret-storage`
- `vscode-roo-task-index`

### Optional candidate inputs

- `roo-env-local`
- additional Roo storage files and logs

`roo-env-local` is useful for comparison and import scenarios, but it is not allowed to decide Roo health by itself.

## Source-of-Truth Rules

### Codex

Codex health is evaluated against its file-backed truth sources:

- `auth.json` for auth secret
- `config.toml` for provider, base URL, and model

### Roo

Roo health is evaluated against three separate layers:

1. Active selector and non-secret metadata from `vscode-roo-state-db`
2. Active secret presence from `vscode-roo-secret-storage`
3. Runtime evidence from `vscode-roo-task-index`

The task index is evidence, not the canonical source.  
The candidate env file is reference material, not the canonical source.

## Status Rules

### Healthy

Emit `healthy` only when:

- all required snapshots are present
- Roo global state is readable
- Roo SecretStorage presence is confirmed
- runtime evidence does not contradict the active Roo selector

### Invalid Config

Emit `invalid_config` when any required active-state input is missing or invalid.

Examples:

- `auth.json` missing or malformed
- Roo global state row missing from `state.vscdb`
- Roo SecretStorage rows missing or empty
- Roo task index unreadable

### Drift Detected

Emit `drift_detected` when Roo runtime evidence disagrees with the active selector or metadata, but the disagreement is still bounded and parseable.

Examples:

- `currentApiConfigName` differs from the current workspace `apiConfigName`
- runtime model or base URL disagrees with the active Roo global-state row

### Auto Fixable

Emit `auto_fixable` only for bounded repair paths that do not require encrypted secret mutation.

At the moment, that means a future state where task-index-only drift can be aligned without touching Roo SecretStorage.

### Manual Action Required

Emit `manual_action_required` when the project can see Roo active-state structure but cannot safely complete the repair.

Examples:

- Roo active secrets exist only in encrypted SecretStorage rows
- multiple Roo runtime sources disagree in ways that require operator review
- a repair would require direct `state.vscdb` mutation without a supported bridge

## Rule Priorities

1. `invalid_config` overrides all lower-severity outcomes.
2. `manual_action_required` overrides `auto_fixable` when the Roo Secret bridge is missing.
3. `auto_fixable` overrides `drift_detected` only when the mutation scope is bounded and backup-first.
4. `healthy` is emitted only when no rule violations remain.

## Evidence Requirements

Each diagnosis should capture:

- snapshot ids and source names
- redacted fingerprints when available
- last-modified timestamps when available
- the specific drift fields that fired
- whether Roo Secret bridge support is required
- the suggested next action

## Explicit Non-Rules

- Missing `.roo/.env.local` does not, by itself, make Roo invalid.
- Editing `.roo/.env.local` does not, by itself, resolve Roo drift.
- A present Roo task index does not, by itself, prove the active secret is readable.
