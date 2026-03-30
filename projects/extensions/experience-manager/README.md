# Experience Manager

Cloud-first experience tracking for OpenClaw.

## What it does

- Stores experience records and notes in cloud MySQL as the source of truth.
- Keeps the UI and API inside the plugin itself.
- Mirrors selected records into `memory-lancedb-pro` for semantic recall.

## Storage model

- Primary storage: cloud MySQL
- Local JSON: migration-only fallback, not part of the normal runtime path
- Cloud sync to HTTP endpoints: optional, separate from cloud storage

## Codex MCP bridge

This plugin now includes a Codex-facing MCP server at:

`mcp/experience-manager-mcp.mjs`

It exposes the same cloud-backed experience and note data through MCP tools, so Codex can read and write the same records.
`record_experience` also refreshes the qmd mirror automatically after a successful write.

Register it with:

```powershell
codex mcp add experience-manager -- node "E:\Auto\projects\extensions\experience-manager\mcp\experience-manager-mcp.mjs"
```

## QMD mirror

The cloud-backed records can also be mirrored into a qmd collection:

`E:\Auto\projects\extensions\qmd\collections\experience-manager`

Refresh it with:

```powershell
npm run sync:qmd
```

## Cloud database

Default connection:

- Host: `124.220.245.121`
- Port: `22295`
- User: `openclaw`
- Database: `app_db`

Tables:

- `experience_records_cloud`
- `experience_notes_cloud`

## API

- `GET /api/experience/stats`
- `GET /api/experience/records`
- `POST /api/experience/records`
- `PUT /api/experience/records/:id`
- `DELETE /api/experience/records/:id`
- `GET /api/experience/notes`
- `POST /api/experience/notes`
- `PUT /api/experience/notes/:id`
- `DELETE /api/experience/notes/:id`
- `GET /api/experience/cloud/status`
- `POST /api/experience/cloud/sync`

## Notes on migration

If local JSON files still exist from an older build, they should be migrated once into the cloud tables and then removed. New runtime code should not depend on them.

