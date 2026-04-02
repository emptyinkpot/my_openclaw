# Experience Manager MCP

This is the Codex-facing MCP bridge for `experience-manager`.

It talks to the same cloud MySQL backend used by the plugin, so Codex can read and write the same experience records and notes.

## Register with Codex

```powershell
codex mcp add experience-manager -- node "E:\Auto\projects\extensions\experience-manager\mcp\experience-manager-mcp.mjs"
```

## Available tools

- `cloud_health`
- `list_experiences`
- `search_experiences`
- `get_experience`
- `record_experience`
- `delete_experience`
- `list_notes`
- `search_notes`
- `get_note`
- `record_note`
- `delete_note`
- `plugin_overview`
