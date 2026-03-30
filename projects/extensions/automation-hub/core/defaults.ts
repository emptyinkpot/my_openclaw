import type { AutomationFeishuConfig, JsonRecord } from '../contracts';

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is JsonRecord => {
    return Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry);
  });
}

export function createDefaultFeishuConfig(): AutomationFeishuConfig {
  return {
    enabled: false,
    bot: {},
    settings: {},
    templates: [],
    commands: [],
    webhooks: [],
  };
}

export function normalizeFeishuConfig(value: unknown): AutomationFeishuConfig {
  const record = asRecord(value);

  return {
    enabled: Boolean(record.enabled),
    bot: asRecord(record.bot),
    settings: asRecord(record.settings),
    templates: asRecordArray(record.templates),
    commands: asRecordArray(record.commands),
    webhooks: asRecordArray(record.webhooks),
  };
}
