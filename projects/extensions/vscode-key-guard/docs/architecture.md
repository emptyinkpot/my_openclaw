# Architecture

## Overview

`vscode-key-guard` is a local-first module for watching VS Code API key configuration drift across Codex and Roo Code.

The first implementation target is read-only diagnosis. Controlled repair stays behind explicit safety checks.

## Flow

1. Collect snapshots from disk config, VS Code state, and runtime-adjacent artifacts.
2. Normalize them into shared core types.
3. Run diagnosis rules to classify the current health state.
4. Persist redacted state snapshots and audit events.
5. Expose the result through backend APIs, future UI panels, and MCP tools.

## Layers

### Core

Shared types, comparison rules, redaction helpers, and repair action contracts.

### Backend

Hosts snapshot APIs, diagnosis routes, repair endpoints, and periodic scan jobs.

### Frontend

Shows source health, drift status, latest scans, and guarded repair actions.

### State

Stores redacted latest snapshots, event history, lock files, and repair execution markers.

## Safety Model

- Never write raw API keys into logs or rendered pages.
- Every repair action must support backup-first behavior.
- High-risk actions must require an explicit approval gate.
- Runtime and disk mismatches should be preserved as evidence before any mutation.

## Baseline File Roles

- `backend/routes`: HTTP entry points for scan, status, and repair.
- `backend/services`: snapshot readers, diagnosis logic, and audit writes.
- `core/types`: shared TypeScript contracts.
- `core/rules`: provider-specific drift rules.
- `frontend/pages/vscode-key-guard`: module dashboard shell.
- `state/latest.json`: most recent redacted snapshot bundle.
- `state/history`: append-only diagnosis and repair records.
