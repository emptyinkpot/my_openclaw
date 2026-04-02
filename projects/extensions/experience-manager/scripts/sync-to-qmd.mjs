import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

const DEFAULT_DB_CONFIG = {
  host: process.env.DB_HOST || "124.220.245.121",
  port: Number.parseInt(process.env.DB_PORT || "22295", 10),
  user: process.env.DB_USER || "openclaw",
  password: process.env.DB_PASSWORD || "Lgp15237257500",
  database: process.env.DB_NAME || "cloudbase-4glvyyq9f61b19cd",
  charset: "utf8mb4",
};

const OUTPUT_ROOT = process.env.QMD_EXPERIENCE_COLLECTION_DIR
  ? path.resolve(process.env.QMD_EXPERIENCE_COLLECTION_DIR)
  : path.resolve(projectRoot, "..", "qmd", "collections", "experience-manager");

function slugify(value) {
  return String(value || "item")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(/[\n,|/]+/).map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function toText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return JSON.stringify(value, null, 2);
}

function yamlList(items) {
  if (!items || items.length === 0) return "[]";
  return `[${items.map(item => JSON.stringify(String(item))).join(", ")}]`;
}

function yamlValue(value) {
  if (value == null || value === "") return '""';
  return JSON.stringify(String(value));
}

function frontmatter(lines) {
  return ["---", ...lines, "---"].join("\n");
}

async function getPool() {
  return mysql.createPool({
    host: DEFAULT_DB_CONFIG.host,
    port: DEFAULT_DB_CONFIG.port,
    user: DEFAULT_DB_CONFIG.user,
    password: DEFAULT_DB_CONFIG.password,
    database: DEFAULT_DB_CONFIG.database,
    charset: DEFAULT_DB_CONFIG.charset,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
  });
}

async function exportExperiences(pool) {
  const [rows] = await pool.query(
    "SELECT * FROM experience_records_cloud ORDER BY updated_at DESC, timestamp DESC"
  );

  const experienceDir = path.join(OUTPUT_ROOT, "experiences");
  await mkdir(experienceDir, { recursive: true });

  for (const row of rows) {
    const title = row.title || "Untitled";
    const date = new Date(Number(row.timestamp) || Date.now()).toISOString().slice(0, 10);
    const fileName = `${date}-${slugify(title)}-${row.id}.md`;
    const filePath = path.join(experienceDir, fileName);
    const applied = toArray(row.experience_applied);
    const gained = toArray(row.experience_gained);
    const tags = toArray(row.tags_text);
    const verification = toArray(row.verification);
    const source = row.source_text ? JSON.parse(row.source_text) : {};

    const body = [
      frontmatter([
        `id: ${yamlValue(row.id)}`,
        `title: ${yamlValue(title)}`,
        `type: ${yamlValue(row.type)}`,
        `date: ${yamlValue(new Date(Number(row.timestamp) || Date.now()).toISOString())}`,
        `updated_at: ${yamlValue(row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString())}`,
        `difficulty: ${Number(row.difficulty) || 1}`,
        `xp_gained: ${Number(row.xp_gained) || 0}`,
        `tags: ${yamlList(tags)}`,
        `source_project: ${yamlValue(source?.project || "")}`,
        `source_file: ${yamlValue(source?.file || "")}`,
      ]),
      `# ${title}`,
      "",
      "## Summary",
      toText(row.summary || row.description || title),
      "",
      "## Problem",
      toText(row.user_query || ""),
      "",
      "## Solution",
      toText(row.solution || ""),
      "",
      "## Applied",
      ...(applied.length ? applied.map(item => `- ${item}`) : ["-"]),
      "",
      "## Gained",
      ...(gained.length ? gained.map(item => `- ${item}`) : ["-"]),
      "",
      "## Verification",
      ...(verification.length ? verification.map(item => `- ${item}`) : ["-"]),
      "",
      "## Source",
      `- project: ${source?.project || ""}`,
      `- branch: ${source?.branch || ""}`,
      `- file: ${source?.file || ""}`,
      `- url: ${source?.url || ""}`,
    ].join("\n");

    await writeFile(filePath, body, "utf8");
  }

  return rows.length;
}

async function exportNotes(pool) {
  const [rows] = await pool.query(
    "SELECT * FROM experience_notes_cloud ORDER BY updated_at DESC, created_at DESC"
  );

  const notesDir = path.join(OUTPUT_ROOT, "notes");
  await mkdir(notesDir, { recursive: true });

  for (const row of rows) {
    const title = row.title || "Untitled";
    const date = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const fileName = `${date}-${slugify(title)}-${row.id}.md`;
    const filePath = path.join(notesDir, fileName);
    const tags = toArray(row.tags_text);
    const related = toArray(row.related_experience_ids);
    const sections = row.sections_text ? JSON.parse(row.sections_text) : {};

    const body = [
      frontmatter([
        `id: ${yamlValue(row.id)}`,
        `title: ${yamlValue(title)}`,
        `category: ${yamlValue(row.category)}`,
        `created_at: ${yamlValue(row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString())}`,
        `updated_at: ${yamlValue(row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString())}`,
        `tags: ${yamlList(tags)}`,
        `related_experience_ids: ${yamlList(related)}`,
      ]),
      `# ${title}`,
      "",
      "## Summary",
      toText(row.summary || title),
      "",
      "## Content",
      toText(row.content || ""),
      "",
      "## Sections",
      ...(Object.keys(sections).length
        ? Object.entries(sections).flatMap(([key, value]) => ["", `### ${key}`, toText(value)])
        : ["-"]),
    ].join("\n");

    await writeFile(filePath, body, "utf8");
  }

  return rows.length;
}

async function writeIndex(experienceCount, noteCount) {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const readme = [
    "# Experience Manager Mirror",
    "",
    "This collection mirrors shared experience records from the cloud-backed experience manager.",
    "",
    `- Experience records: ${experienceCount}`,
    `- Notes: ${noteCount}`,
    "",
    "Refresh it with `npm run sync:qmd` from the experience-manager plugin folder.",
  ].join("\n");
  await writeFile(path.join(OUTPUT_ROOT, "README.md"), readme, "utf8");
}

async function main() {
  const pool = await getPool();
  try {
    const experienceCount = await exportExperiences(pool);
    const noteCount = await exportNotes(pool);
    await writeIndex(experienceCount, noteCount);
    console.log(`Exported ${experienceCount} experiences and ${noteCount} notes to ${OUTPUT_ROOT}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[sync-to-qmd] fatal error:", error);
  process.exitCode = 1;
});
