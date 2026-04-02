---
id: "exp_1774425190416_sz9qc0qr"
title: "Memory governance bridge and auto-sync flow"
type: "learning"
date: "2026-03-25T07:53:10.416Z"
updated_at: "2026-03-24T23:53:10.000Z"
difficulty: 2
xp_gained: 10
tags: ["memory", "qmd", "experience-manager", "mcp", "skills", "sync", "bridge", "governance"]
source_project: "E:\\Auto\\projects\\extensions\\plugins"
source_file: ""
---
# Memory governance bridge and auto-sync flow

## Summary
Added a memory-lancedb-pro bridge, wired experience-manager to auto-sync qmd and memory mirrors, and promoted qmd -> bridge -> experience-manager as the default reusable-answer loop.

## Problem
How do we make Codex read memory automatically and record durable corrections without me having to restate the process?

## Solution
Create a memory-lancedb-pro skill as a governance layer. Add a Codex MCP bridge that reads the markdown mirror / export snapshots. Keep experience-manager as the durable write path. Auto-sync qmd and memory-lancedb-pro mirrors after record_experience and record_note. Use qmd -> bridge -> experience-manager as the default reusable-answer loop.

## Applied
- Treat long-term memory as a layered system: retrieval, bridge, durable store.
- Prefer automatic mirror refresh after writes so the read path stays current.
- Make the memory workflow default behavior in skills, not a manual reminder.

## Gained
- memory-lancedb-pro can be integrated as a readable mirror and governance layer for Codex.
- A bridge MCP is useful when the backend is not a native Codex store but still exposes mirror/export data.
- A unified memory skill should prefer qmd first, then memory-policy bridge, then durable writeback.

## Verification
- node --check passed for the bridge and sync scripts.
- Cloud experience count can be incremented through direct durable writeback.
- memory-lancedb-pro mirror export completed successfully.

## Source
- project: E:\Auto\projects\extensions\plugins
- branch: 
- file: 
- url: 