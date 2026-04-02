import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..");

const DEFAULT_MIRROR_DIR = process.env.MEMORY_LANCEDB_PRO_MIRROR_DIR
  ? path.resolve(process.env.MEMORY_LANCEDB_PRO_MIRROR_DIR)
  : path.join(repoRoot, "mirror");
const DEFAULT_EXPORT_DIR = process.env.MEMORY_LANCEDB_PRO_EXPORT_DIR
  ? path.resolve(process.env.MEMORY_LANCEDB_PRO_EXPORT_DIR)
  : path.join(repoRoot, "exports");
const DEFAULT_EXPORT_FILE = process.env.MEMORY_LANCEDB_PRO_EXPORT_FILE
  ? path.resolve(process.env.MEMORY_LANCEDB_PRO_EXPORT_FILE)
  : path.join(DEFAULT_EXPORT_DIR, "memory-lancedb-pro.json");

const mirrorExtensions = new Set([".md", ".markdown"]);

function asText(value) {
  return [{ type: "text", text: value }];
}

function safeJsonParse(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
    .trim();
}

function words(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

function scoreText(haystack, queryWords) {
  if (!haystack || queryWords.length === 0) return 0;
  const hay = normalizeText(haystack);
  let score = 0;
  for (const word of queryWords) {
    if (hay.includes(word)) score += 2;
  }
  return score;
}

async function walkFiles(root) {
  const results = [];
  async function visit(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }
  await visit(root);
  return results;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    if (raw.startsWith("[") || raw.startsWith("{")) {
      fm[key] = safeJsonParse(raw, raw);
    } else if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      fm[key] = raw.slice(1, -1);
    } else if (/^(true|false)$/i.test(raw)) {
      fm[key] = raw.toLowerCase() === "true";
    } else if (!Number.isNaN(Number(raw)) && raw !== "") {
      fm[key] = Number(raw);
    } else {
      fm[key] = raw;
    }
  }
  return fm;
}

function extractHeading(content, fallback = "") {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function excerpt(content, queryWords, length = 220) {
  const text = String(content ?? "");
  if (queryWords.length === 0) return text.slice(0, length);
  const lower = text.toLowerCase();
  const index = queryWords
    .map((word) => lower.indexOf(word))
    .filter((value) => value >= 0)
    .sort((a, b) => a - b)[0];
  if (index == null || index < 0) return text.slice(0, length);
  const start = Math.max(0, index - 80);
  return text.slice(start, start + length);
}

async function loadMirrorEntries() {
  const root = DEFAULT_MIRROR_DIR;
  const files = (await walkFiles(root)).filter((file) => mirrorExtensions.has(path.extname(file).toLowerCase()));
  const entries = [];
  for (const file of files) {
    try {
      const content = await readFile(file, "utf8");
      const fm = parseFrontmatter(content);
      const title = String(fm.title || extractHeading(content, path.basename(file, path.extname(file))));
      entries.push({
        kind: "mirror",
        id: String(fm.id || path.basename(file, path.extname(file))),
        title,
        category: String(fm.category || ""),
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        path: file,
        content,
        summary: String(fm.summary || "").trim(),
        createdAt: String(fm.created_at || fm.date || ""),
        updatedAt: String(fm.updated_at || ""),
      });
    } catch {
      // ignore unreadable file
    }
  }
  return entries;
}

async function loadLatestExportFile() {
  try {
    const direct = await stat(DEFAULT_EXPORT_FILE);
    if (direct.isFile()) return DEFAULT_EXPORT_FILE;
  } catch {
    // ignore
  }

  let files = [];
  try {
    files = (await readdir(DEFAULT_EXPORT_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".json")
      .map((entry) => path.join(DEFAULT_EXPORT_DIR, entry.name));
  } catch {
    return null;
  }

  if (files.length === 0) return null;

  let latest = null;
  let latestMtime = -1;
  for (const file of files) {
    try {
      const info = await stat(file);
      if (info.mtimeMs > latestMtime) {
        latestMtime = info.mtimeMs;
        latest = file;
      }
    } catch {
      // ignore
    }
  }
  return latest;
}

async function loadExportEntries() {
  const file = await loadLatestExportFile();
  if (!file) return [];

  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    const memories = Array.isArray(parsed?.memories) ? parsed.memories : [];
    return memories
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        kind: "export",
        id: String(item.id || ""),
        title: String(item.title || item.summary || item.text || "Untitled"),
        category: String(item.category || ""),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        path: file,
        content: String(item.text || item.summary || ""),
        summary: String(item.summary || "").trim(),
        createdAt: String(item.timestamp || ""),
        updatedAt: String(item.updatedAt || item.updated_at || ""),
        raw: item,
      }));
  } catch {
    return [];
  }
}

function rankEntries(entries, query, limit) {
  const queryWords = words(query);
  const scored = entries.map((entry) => {
    const tagsText = Array.isArray(entry.tags) ? entry.tags.join(" ") : "";
    const body = [
      entry.id,
      entry.title,
      entry.category,
      entry.summary,
      entry.content,
      tagsText,
      entry.path,
    ].join("\n");
    const score =
      scoreText(entry.title, queryWords) * 5 +
      scoreText(tagsText, queryWords) * 4 +
      scoreText(entry.summary, queryWords) * 3 +
      scoreText(entry.content, queryWords) +
      scoreText(entry.path, queryWords) * 0.5;
    if (score <= 0) return null;
    return {
      ...entry,
      score,
      excerpt: excerpt(body, queryWords),
    };
  }).filter(Boolean);

  return scored
    .sort((a, b) => (b.score - a.score) || String(a.title).localeCompare(String(b.title)))
    .slice(0, limit);
}

async function searchBridge(query, limit, source) {
  const mirror = source === "export" ? [] : await loadMirrorEntries();
  const exportEntries = source === "mirror" ? [] : await loadExportEntries();
  return rankEntries([...mirror, ...exportEntries], query, limit);
}

async function resolveEntry(identifier) {
  const mirrorEntries = await loadMirrorEntries();
  const exportEntries = await loadExportEntries();
  const all = [...mirrorEntries, ...exportEntries];

  const directFile = path.resolve(identifier);
  try {
    const info = await stat(directFile);
    if (info.isFile()) {
      return {
        kind: "file",
        path: directFile,
        content: await readFile(directFile, "utf8"),
      };
    }
  } catch {
    // ignore direct path miss
  }

  const lower = normalizeText(identifier);
  const found = all.find((entry) =>
    normalizeText(entry.id).includes(lower) ||
    normalizeText(entry.title).includes(lower) ||
    normalizeText(path.basename(entry.path)).includes(lower)
  );
  if (!found) return null;

  return {
    ...found,
    content: found.kind === "mirror" ? found.content : JSON.stringify(found.raw, null, 2),
  };
}

async function main() {
  const server = new McpServer({
    name: "memory-lancedb-pro-bridge",
    version: "1.0.0",
  });

  server.tool("bridge_overview", {}, async () => {
    const mirrorEntries = await loadMirrorEntries();
    const exportEntries = await loadExportEntries();
    const overview = {
      repoRoot,
      mirrorDir: DEFAULT_MIRROR_DIR,
      exportDir: DEFAULT_EXPORT_DIR,
      exportFile: DEFAULT_EXPORT_FILE,
      counts: {
        mirrorEntries: mirrorEntries.length,
        exportEntries: exportEntries.length,
      },
      sources: ["mirror", "export"],
    };
    return { content: asText(JSON.stringify(overview, null, 2)) };
  });

  server.tool(
    "search_memory_bridge",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional().default(10),
      source: z.enum(["mirror", "export", "all"]).optional().default("all"),
    },
    async ({ query, limit, source }) => {
      const results = await searchBridge(query, limit, source);
      return { content: asText(JSON.stringify(results, null, 2)) };
    }
  );

  server.tool(
    "read_memory_bridge",
    {
      id_or_path: z.string().min(1),
    },
    async ({ id_or_path }) => {
      const entry = await resolveEntry(id_or_path);
      if (!entry) {
        return { content: asText(`No mirrored or exported memory found for ${id_or_path}`) };
      }
      return { content: asText(JSON.stringify(entry, null, 2)) };
    }
  );

  server.tool(
    "list_memory_sources",
    {},
    async () => {
      const payload = {
        mirrorDir: DEFAULT_MIRROR_DIR,
        exportDir: DEFAULT_EXPORT_DIR,
        exportFile: DEFAULT_EXPORT_FILE,
      };
      return { content: asText(JSON.stringify(payload, null, 2)) };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[memory-lancedb-pro-bridge] fatal error:", error);
  process.exitCode = 1;
});
