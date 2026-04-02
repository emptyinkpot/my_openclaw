import type { ExperienceRecord } from './ExperienceRepository';
import type { NoteRecord } from './NoteRepository';

export interface CloudSyncConfig {
  enabled: boolean;
  endpoint: string;
  pathPrefix: string;
  token: string;
  namespace: string;
  timeoutMs: number;
  syncNotes: boolean;
}

export interface CloudSyncStatus {
  enabled: boolean;
  configured: boolean;
  endpoint: string | null;
  pathPrefix: string;
  namespace: string;
  timeoutMs: number;
  syncNotes: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastTarget: string | null;
}

export interface CloudSyncResult {
  ok: boolean;
  status: number;
  target: string;
  responseText?: string;
  error?: string;
}

export type CloudMutation = 'upsert' | 'delete';

export interface CloudExperienceEnvelope {
  schemaVersion: '1.0';
  entity: 'experience';
  action: CloudMutation;
  localId: string;
  capturedAt: number;
  capturedAtIso: string;
  payload: {
    title: string;
    type: ExperienceRecord['type'];
    summary: string;
    problem: string;
    rootCause: string;
    solution: string;
    applied: string[];
    lessons: string[];
    tags: string[];
    difficulty: number;
    xpGained: number;
    source?: ExperienceRecord['source'];
    verification?: string[];
  };
}

export interface CloudNoteEnvelope {
  schemaVersion: '1.0';
  entity: 'note';
  action: CloudMutation;
  localId: string;
  capturedAt: string;
  payload: {
    title: string;
    category: string;
    summary: string;
    content: string;
    tags: string[];
    relatedExperienceIds?: string[];
    sections?: Record<string, string>;
  };
}

export interface CloudSyncBatch {
  experiences?: ExperienceRecord[];
  notes?: NoteRecord[];
}

const DEFAULT_PATH_PREFIX = '/api/experience-cloud';

let lastSuccessAt: string | null = null;
let lastError: string | null = null;
let lastTarget: string | null = null;

function readBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value === '') return defaultValue;
  return !['false', '0', 'off', 'no'].includes(value.toLowerCase());
}

function readNumber(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,，;；|/]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildEndpoint(config: CloudSyncConfig): string {
  const base = config.endpoint.replace(/\/+$/, '');
  const prefix = config.pathPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${base}/${prefix}`;
}

function buildHeaders(config: CloudSyncConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-OpenClaw-Source': 'experience-manager',
    'X-OpenClaw-Namespace': config.namespace,
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  return headers;
}

function getFetch(): any {
  return (globalThis as any).fetch;
}

async function postJson(target: string, body: unknown, config: CloudSyncConfig): Promise<CloudSyncResult> {
  const fetchImpl = getFetch();
  if (typeof fetchImpl !== 'function') {
    return { ok: false, status: 0, target, error: 'fetch unavailable in this runtime' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(target, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text().catch(() => '');
    const ok = response.ok;

    if (ok) {
      lastSuccessAt = new Date().toISOString();
      lastError = null;
      lastTarget = target;
    } else {
      lastError = responseText || `HTTP ${response.status}`;
      lastTarget = target;
    }

    return {
      ok,
      status: response.status,
      target,
      responseText,
      error: ok ? undefined : lastError || undefined,
    };
  } catch (error: any) {
    const message = error?.name === 'AbortError'
      ? `timeout after ${config.timeoutMs}ms`
      : (error?.message || String(error));
    lastError = message;
    lastTarget = target;
    return {
      ok: false,
      status: 0,
      target,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function getCloudSyncConfig(): CloudSyncConfig {
  const endpoint = (process.env.EXPERIENCE_CLOUD_SYNC_ENDPOINT || process.env.OPENCLAW_EXPERIENCE_CLOUD_ENDPOINT || '').trim();
  const pathPrefix = (process.env.EXPERIENCE_CLOUD_SYNC_PATH_PREFIX || DEFAULT_PATH_PREFIX).trim() || DEFAULT_PATH_PREFIX;
  const token = (process.env.EXPERIENCE_CLOUD_SYNC_TOKEN || process.env.OPENCLAW_EXPERIENCE_CLOUD_TOKEN || '').trim();
  const namespace = (process.env.EXPERIENCE_CLOUD_SYNC_NAMESPACE || 'experience-manager').trim();
  const timeoutMs = readNumber(process.env.EXPERIENCE_CLOUD_SYNC_TIMEOUT_MS, 8000);
  const syncNotes = readBool(process.env.EXPERIENCE_CLOUD_SYNC_NOTES, true);
  const enabled = readBool(process.env.EXPERIENCE_CLOUD_SYNC, Boolean(endpoint)) && Boolean(endpoint);

  return {
    enabled,
    endpoint,
    pathPrefix,
    token,
    namespace,
    timeoutMs,
    syncNotes,
  };
}

export function getCloudSyncStatus(): CloudSyncStatus {
  const config = getCloudSyncConfig();
  return {
    enabled: config.enabled,
    configured: Boolean(config.endpoint),
    endpoint: config.endpoint || null,
    pathPrefix: config.pathPrefix,
    namespace: config.namespace,
    timeoutMs: config.timeoutMs,
    syncNotes: config.syncNotes,
    lastSuccessAt,
    lastError,
    lastTarget,
  };
}

function buildExperienceEnvelope(record: ExperienceRecord, action: CloudMutation): CloudExperienceEnvelope {
  const summary = record.description || record.userQuery || record.title;
  return {
    schemaVersion: '1.0',
    entity: 'experience',
    action,
    localId: record.id,
    capturedAt: record.timestamp,
    capturedAtIso: new Date(record.timestamp).toISOString(),
    payload: {
      title: record.title,
      type: record.type,
      summary,
      problem: record.userQuery,
      rootCause: record.rootCause || '',
      solution: record.solution,
      applied: normalizeList(record.experienceApplied),
      lessons: normalizeList(record.experienceGained),
      tags: normalizeList(record.tags),
      difficulty: record.difficulty,
      xpGained: record.xpGained,
      source: record.source,
      verification: normalizeList(record.verification),
    },
  };
}

function buildNoteEnvelope(note: NoteRecord, action: CloudMutation): CloudNoteEnvelope {
  return {
    schemaVersion: '1.0',
    entity: 'note',
    action,
    localId: note.id,
    capturedAt: note.created_at,
    payload: {
      title: note.title,
      category: note.category,
      summary: note.summary || note.title,
      content: note.content,
      tags: normalizeList(note.tags),
      relatedExperienceIds: normalizeList(note.relatedExperienceIds),
      sections: note.sections,
    },
  };
}

export async function syncExperienceToCloud(
  record: ExperienceRecord,
  action: CloudMutation = 'upsert'
): Promise<CloudSyncResult> {
  const config = getCloudSyncConfig();
  if (!config.enabled) {
    return { ok: false, status: 0, target: '', error: 'cloud sync disabled' };
  }

  const target = `${buildEndpoint(config)}/experiences`;
  return postJson(target, buildExperienceEnvelope(record, action), config);
}

export async function syncNoteToCloud(
  note: NoteRecord,
  action: CloudMutation = 'upsert'
): Promise<CloudSyncResult> {
  const config = getCloudSyncConfig();
  if (!config.enabled || !config.syncNotes) {
    return { ok: false, status: 0, target: '', error: 'cloud sync disabled for notes' };
  }

  const target = `${buildEndpoint(config)}/notes`;
  return postJson(target, buildNoteEnvelope(note, action), config);
}

export async function syncAllToCloud(batch: CloudSyncBatch): Promise<{
  experiences: number;
  notes: number;
  skipped: boolean;
  errors: Array<{ target: string; error: string }>;
}> {
  const config = getCloudSyncConfig();
  if (!config.enabled) {
    return { experiences: 0, notes: 0, skipped: true, errors: [] };
  }

  const errors: Array<{ target: string; error: string }> = [];
  let experiences = 0;
  let notes = 0;

  for (const record of batch.experiences || []) {
    const result = await syncExperienceToCloud(record);
    if (result.ok) {
      experiences++;
    } else if (result.error) {
      errors.push({ target: result.target, error: result.error });
    }
  }

  for (const note of batch.notes || []) {
    const result = await syncNoteToCloud(note);
    if (result.ok) {
      notes++;
    } else if (result.error) {
      errors.push({ target: result.target, error: result.error });
    }
  }

  return { experiences, notes, skipped: false, errors };
}
