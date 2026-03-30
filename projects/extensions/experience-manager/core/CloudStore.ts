import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as mysql from 'mysql2/promise';

export interface CloudDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  charset: 'utf8mb4';
}

type JsonObject = Record<string, any>;

const EXPERIENCE_TABLE = 'experience_records_cloud';
const NOTE_TABLE = 'experience_notes_cloud';

const DEFAULT_DB_CONFIG: CloudDbConfig = {
  host: process.env.DB_HOST || '124.220.245.121',
  port: Number.parseInt(process.env.DB_PORT || '22295', 10),
  user: process.env.DB_USER || 'openclaw',
  password: process.env.DB_PASSWORD || 'CHANGE_ME_DB_PASSWORD',
  database: process.env.DB_NAME || 'app_db',
  charset: 'utf8mb4',
};

const poolCache = new Map<string, mysql.Pool>();

function getPool(): mysql.Pool {
  const key = `${DEFAULT_DB_CONFIG.host}:${DEFAULT_DB_CONFIG.port}/${DEFAULT_DB_CONFIG.database}`;
  if (!poolCache.has(key)) {
    poolCache.set(key, mysql.createPool({
      host: DEFAULT_DB_CONFIG.host,
      port: DEFAULT_DB_CONFIG.port,
      user: DEFAULT_DB_CONFIG.user,
      password: DEFAULT_DB_CONFIG.password,
      database: DEFAULT_DB_CONFIG.database,
      charset: DEFAULT_DB_CONFIG.charset,
      waitForConnections: true,
      connectionLimit: 6,
      queueLimit: 0,
      connectTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    }));
  }
  return poolCache.get(key)!;
}

function safeJsonParse<T>(value: any, fallback: T): T {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      const parsed = safeJsonParse<any[]>(trimmed, []);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    }

    return trimmed
      .split(/[\n,銆侊紝|/]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseObject(value: unknown): JsonObject {
  if (!value) return {};
  if (typeof value === 'object') return value as JsonObject;
  if (typeof value !== 'string') return {};
  const parsed = safeJsonParse<any>(value, {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function toMysqlDatetime(value: unknown): string {
  const date = value instanceof Date
    ? value
    : new Date(typeof value === 'number' || typeof value === 'string' ? value : Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function ensureExperienceTable(): Promise<void> {
  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ${EXPERIENCE_TABLE} (
      id varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
      timestamp bigint NOT NULL,
      type varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
      title varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      difficulty tinyint NOT NULL DEFAULT '1',
      xp_gained int NOT NULL DEFAULT '0',
      description longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      user_query longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      solution longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      experience_applied longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      experience_gained longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      tags_text longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      summary longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      root_cause longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      verification longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      source_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      cloud_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      payload longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      created_at timestamp NOT NULL DEFAULT current_timestamp(),
      updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (id),
      KEY idx_experience_timestamp (timestamp),
      KEY idx_experience_type (type),
      KEY idx_experience_title (title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureNoteTable(): Promise<void> {
  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ${NOTE_TABLE} (
      id varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
      title varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      category varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
      tags_text longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      summary longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      sections_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      related_experience_ids longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      cloud_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      payload longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      created_at timestamp NOT NULL DEFAULT current_timestamp(),
      updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      content longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      PRIMARY KEY (id),
      KEY idx_note_category (category),
      KEY idx_note_title (title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function reviveExperience(row: any): any {
  const payload = parseObject(row?.payload);
  const fallback = {
    id: row?.id,
    timestamp: Number(row?.timestamp) || Date.now(),
    type: row?.type || 'learning',
    title: row?.title || '',
    description: row?.description || '',
    userQuery: row?.user_query || '',
    solution: row?.solution || '',
    experienceApplied: parseList(row?.experience_applied),
    experienceGained: parseList(row?.experience_gained),
    tags: parseList(row?.tags_text),
    difficulty: Number(row?.difficulty) || 1,
    xpGained: Number(row?.xp_gained) || 0,
    summary: row?.summary || '',
    rootCause: row?.root_cause || '',
    verification: parseList(row?.verification),
    source: parseObject(row?.source_text),
    cloud: parseObject(row?.cloud_text),
  };

  return {
    ...fallback,
    ...payload,
    experienceApplied: parseList(payload.experienceApplied ?? payload.experience_applied ?? fallback.experienceApplied),
    experienceGained: parseList(payload.experienceGained ?? payload.experience_gained ?? fallback.experienceGained),
    tags: parseList(payload.tags ?? fallback.tags),
    verification: parseList(payload.verification ?? fallback.verification),
    source: parseObject(payload.source ?? fallback.source),
    cloud: parseObject(payload.cloud ?? fallback.cloud),
  };
}

function reviveNote(row: any): any {
  const payload = parseObject(row?.payload);
  const fallback = {
    id: row?.id,
    title: row?.title || '',
    content: row?.content || '',
    category: row?.category || '',
    tags: parseList(row?.tags_text),
    created_at: row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    summary: row?.summary || '',
    sections: parseObject(row?.sections_text),
    relatedExperienceIds: parseList(row?.related_experience_ids),
    cloud: parseObject(row?.cloud_text),
  };

  return {
    ...fallback,
    ...payload,
    tags: parseList(payload.tags ?? fallback.tags),
    sections: parseObject(payload.sections ?? fallback.sections),
    relatedExperienceIds: parseList(payload.relatedExperienceIds ?? payload.related_experience_ids ?? fallback.relatedExperienceIds),
    cloud: parseObject(payload.cloud ?? fallback.cloud),
  };
}

export async function loadCloudExperiences(): Promise<any[]> {
  await ensureExperienceTable();
  const [rows] = await getPool().execute<any[]>(
    `SELECT * FROM ${EXPERIENCE_TABLE} WHERE 1 = 1 ORDER BY timestamp DESC, updated_at DESC`
  );
  return rows.map(reviveExperience);
}

export async function loadCloudNotes(): Promise<any[]> {
  await ensureNoteTable();
  const [rows] = await getPool().execute<any[]>(
    `SELECT * FROM ${NOTE_TABLE} WHERE 1 = 1 ORDER BY updated_at DESC, created_at DESC`
  );
  return rows.map(reviveNote);
}

function buildExperienceRow(record: JsonObject): Record<string, any> {
  const experienceApplied = parseList(record.experienceApplied ?? record.experience_applied);
  const experienceGained = parseList(record.experienceGained ?? record.experience_gained);
  const tags = parseList(record.tags);
  const verification = parseList(record.verification);
  const source = parseObject(record.source);
  const cloud = parseObject(record.cloud);
  const createdAt = toMysqlDatetime(Number(record.timestamp) || Date.now());

  return {
    id: record.id,
    timestamp: Number(record.timestamp) || Date.now(),
    type: record.type || 'learning',
    title: record.title || '',
    difficulty: Number(record.difficulty) || 1,
    xp_gained: Number(record.xpGained ?? record.xp_gained) || 0,
    description: toNullableString(record.description || record.summary || record.userQuery || '') || '',
    user_query: toNullableString(record.userQuery || record.problem || '') || '',
    solution: record.solution || '',
    experience_applied: toJsonText(experienceApplied),
    experience_gained: toJsonText(experienceGained),
    tags_text: toJsonText(tags),
    summary: toNullableString(record.summary) ?? null,
    root_cause: toNullableString(record.rootCause) ?? null,
    verification: toJsonText(verification),
    source_text: toNullableString(Object.keys(source).length ? toJsonText(source) : null),
    cloud_text: toNullableString(Object.keys(cloud).length ? toJsonText(cloud) : null),
    created_at: createdAt,
    updated_at: createdAt,
    payload: toJsonText({
      ...record,
      experienceApplied,
      experienceGained,
      tags,
      verification,
      source,
      cloud,
    }),
  };
}

function buildNoteRow(note: JsonObject): Record<string, any> {
  const tags = parseList(note.tags);
  const relatedExperienceIds = parseList(note.relatedExperienceIds ?? note.related_experience_ids);
  const sections = parseObject(note.sections);
  const cloud = parseObject(note.cloud);
  const createdAt = toMysqlDatetime(note.created_at || note.createdAt || Date.now());
  const updatedAt = toMysqlDatetime(note.updated_at || note.updatedAt || createdAt);

  return {
    id: note.id,
    title: note.title || '',
    category: note.category || 'general',
    tags_text: toJsonText(tags),
    summary: toNullableString(note.summary),
    sections_text: toNullableString(Object.keys(sections).length ? toJsonText(sections) : null),
    related_experience_ids: toJsonText(relatedExperienceIds),
    cloud_text: toNullableString(Object.keys(cloud).length ? toJsonText(cloud) : null),
    payload: toJsonText({
      ...note,
      tags,
      sections,
      relatedExperienceIds,
      cloud,
      created_at: createdAt,
      updated_at: updatedAt,
    }),
    created_at: createdAt,
    updated_at: updatedAt,
    content: note.content || '',
  };
}

export async function upsertCloudExperience(record: JsonObject): Promise<void> {
  await ensureExperienceTable();
  const row = buildExperienceRow(record);
  await getPool().execute(
    `INSERT INTO ${EXPERIENCE_TABLE}
      (id, timestamp, type, title, difficulty, xp_gained, description, user_query, solution,
       experience_applied, experience_gained, tags_text, summary, root_cause, verification,
       source_text, cloud_text, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP))
     ON DUPLICATE KEY UPDATE
       timestamp = VALUES(timestamp),
       type = VALUES(type),
       title = VALUES(title),
       difficulty = VALUES(difficulty),
       xp_gained = VALUES(xp_gained),
       description = VALUES(description),
       user_query = VALUES(user_query),
       solution = VALUES(solution),
       experience_applied = VALUES(experience_applied),
       experience_gained = VALUES(experience_gained),
       tags_text = VALUES(tags_text),
       summary = VALUES(summary),
       root_cause = VALUES(root_cause),
       verification = VALUES(verification),
       source_text = VALUES(source_text),
       cloud_text = VALUES(cloud_text),
       payload = VALUES(payload),
       updated_at = CURRENT_TIMESTAMP`,
    [
      row.id,
      row.timestamp,
      row.type,
      row.title,
      row.difficulty,
      row.xp_gained,
      row.description,
      row.user_query,
      row.solution,
      row.experience_applied,
      row.experience_gained,
      row.tags_text,
      row.summary,
      row.root_cause,
      row.verification,
      row.source_text,
      row.cloud_text,
      row.payload,
      row.created_at,
      row.updated_at,
    ]
  );
}

export async function deleteCloudExperience(id: string): Promise<void> {
  await ensureExperienceTable();
  await getPool().execute(`DELETE FROM ${EXPERIENCE_TABLE} WHERE id = ?`, [id]);
}

export async function upsertCloudNote(note: JsonObject): Promise<void> {
  await ensureNoteTable();
  const row = buildNoteRow(note);
  await getPool().execute(
    `INSERT INTO ${NOTE_TABLE}
      (id, title, category, tags_text, summary, sections_text, related_experience_ids,
       cloud_text, payload, created_at, updated_at, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       category = VALUES(category),
       tags_text = VALUES(tags_text),
       summary = VALUES(summary),
       sections_text = VALUES(sections_text),
       related_experience_ids = VALUES(related_experience_ids),
       cloud_text = VALUES(cloud_text),
       payload = VALUES(payload),
       updated_at = CURRENT_TIMESTAMP,
       content = VALUES(content)`,
    [
      row.id,
      row.title,
      row.category,
      row.tags_text,
      row.summary,
      row.sections_text,
      row.related_experience_ids,
      row.cloud_text,
      row.payload,
      row.created_at,
      row.updated_at,
      row.content,
    ]
  );
}

export async function deleteCloudNote(id: string): Promise<void> {
  await ensureNoteTable();
  await getPool().execute(`DELETE FROM ${NOTE_TABLE} WHERE id = ?`, [id]);
}

async function migrateLocalJson<T extends { id: string }>(
  localPath: string | undefined,
  loader: (data: any) => T[],
  upserter: (item: T) => Promise<void>
): Promise<number> {
  if (!localPath || !fs.existsSync(localPath)) {
    return 0;
  }

  const raw = await fsp.readFile(localPath, 'utf-8').catch(() => '');
  if (!raw.trim()) {
    await fsp.rm(localPath, { force: true }).catch(() => {});
    return 0;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 0;
  }

  const items = loader(parsed);
  let migrated = 0;
  for (const item of items) {
    await upserter(item);
    migrated++;
  }

  await fsp.rm(localPath, { force: true }).catch(() => {});
  return migrated;
}

export async function bootstrapCloudExperiences(localPath?: string): Promise<{
  records: any[];
  migrated: number;
  localRemoved: boolean;
}> {
  await ensureExperienceTable();
  const migrated = await migrateLocalJson(
    localPath,
    (data) => Array.isArray(data?.records) ? data.records : [],
    (record) => upsertCloudExperience(record)
  );
  const records = await loadCloudExperiences();
  return { records, migrated, localRemoved: migrated > 0 || (localPath ? !fs.existsSync(localPath) : false) };
}

export async function bootstrapCloudNotes(localPath?: string): Promise<{
  notes: any[];
  migrated: number;
  localRemoved: boolean;
}> {
  await ensureNoteTable();
  const migrated = await migrateLocalJson(
    localPath,
    (data) => Array.isArray(data?.notes) ? data.notes : [],
    (note) => upsertCloudNote(note)
  );
  const notes = await loadCloudNotes();
  return { notes, migrated, localRemoved: migrated > 0 || (localPath ? !fs.existsSync(localPath) : false) };
}

export async function cloudHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getPool().query('SELECT 1 AS ping');
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || String(error) };
  }
}

