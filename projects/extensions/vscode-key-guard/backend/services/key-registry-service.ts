import { readFile, writeFile } from "node:fs/promises";

import type {
  KeyProviderHint,
  StoredKeyCreateInput,
  StoredKeyEntry,
  StoredKeyRegistryFile,
  StoredKeyRegistryRecord,
  StoredKeyUpdateInput,
} from "../../core/types/stored-key.ts";
import { fingerprintSecret } from "../../core/utils/fingerprint.ts";
import { nowIso } from "../../core/utils/time.ts";
import { resolveRuntimeStateFile } from "./runtime-state-paths.ts";

const VALID_PROVIDER_HINTS = new Set<KeyProviderHint>(["codex", "roo", "shared"]);

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalString(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeProviderHints(value: KeyProviderHint[] | undefined): KeyProviderHint[] {
  const normalized = Array.isArray(value)
    ? value.filter((hint): hint is KeyProviderHint => VALID_PROVIDER_HINTS.has(hint))
    : [];

  if (normalized.length === 0) {
    return ["shared"];
  }

  return [...new Set(normalized)];
}

function publicEntryFromRecord(
  record: StoredKeyRegistryRecord,
  registryPath: string,
): StoredKeyEntry {
  return {
    id: record.id,
    label: record.label,
    providerHints: record.providerHints,
    fingerprint: record.fingerprint,
    apiId: record.apiId,
    baseUrl: record.baseUrl,
    model: record.model,
    configName: record.configName,
    note: record.note,
    secretRef:
      record.secretRef ??
      `file://${registryPath.replace(/\\/g, "/")}#${encodeURIComponent(record.id)}`,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastUsageSyncAt: record.lastUsageSyncAt,
    lastUsedAt: record.lastUsedAt,
  };
}

function ensureFingerprint(record: StoredKeyRegistryRecord): StoredKeyRegistryRecord {
  return {
    ...record,
    providerHints: normalizeProviderHints(record.providerHints),
    fingerprint: record.fingerprint || fingerprintSecret(record.secret) || "unknown",
  };
}

export class KeyRegistryService {
  async listEntries(): Promise<StoredKeyEntry[]> {
    const { file, path: registryPath } = await this.readRegistry();
    return file.entries
      .map((record) => publicEntryFromRecord(record, registryPath))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  async getEntry(id: string): Promise<StoredKeyEntry | undefined> {
    const { file, path: registryPath } = await this.readRegistry();
    const record = file.entries.find((item) => item.id === id);
    return record ? publicEntryFromRecord(record, registryPath) : undefined;
  }

  async getEntryByFingerprint(fingerprint: string | undefined): Promise<StoredKeyEntry | undefined> {
    if (!fingerprint) {
      return undefined;
    }

    const { file, path: registryPath } = await this.readRegistry();
    const record = file.entries.find((item) => item.fingerprint === fingerprint);
    return record ? publicEntryFromRecord(record, registryPath) : undefined;
  }

  async createEntry(input: StoredKeyCreateInput): Promise<StoredKeyEntry> {
    const secret = normalizeOptionalString(input.secret);
    if (!secret) {
      throw new Error("A non-empty secret is required.");
    }

    const { file, path: registryPath } = await this.readRegistry();
    const fingerprint = fingerprintSecret(secret) || "unknown";

    if (file.entries.some((item) => item.fingerprint === fingerprint)) {
      throw new Error("A stored key with the same fingerprint already exists.");
    }

    const label = normalizeOptionalString(input.label) ?? `Key ${fingerprint}`;
    const id = this.buildUniqueId(file, normalizeOptionalString(input.id) ?? (slugify(label) || "key"));
    const createdAt = nowIso();

    const record: StoredKeyRegistryRecord = ensureFingerprint({
      id,
      label,
      providerHints: normalizeProviderHints(input.providerHints),
      fingerprint,
      apiId: normalizeOptionalString(input.apiId),
      baseUrl: normalizeOptionalString(input.baseUrl),
      model: normalizeOptionalString(input.model),
      configName: normalizeOptionalString(input.configName),
      note: normalizeOptionalString(input.note),
      createdAt,
      updatedAt: createdAt,
      secret,
    });

    file.entries.push(record);
    await this.writeRegistry(file);

    return publicEntryFromRecord(record, registryPath);
  }

  async updateEntry(id: string, patch: StoredKeyUpdateInput): Promise<StoredKeyEntry> {
    const { file, path: registryPath } = await this.readRegistry();
    const index = file.entries.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error(`Stored key not found: ${id}`);
    }

    const current = file.entries[index];
    const nextSecret = normalizeOptionalString(patch.secret) ?? current.secret;
    const nextFingerprint = fingerprintSecret(nextSecret) || current.fingerprint;

    if (
      nextFingerprint !== current.fingerprint &&
      file.entries.some((item) => item.id !== id && item.fingerprint === nextFingerprint)
    ) {
      throw new Error("Another stored key already uses that fingerprint.");
    }

    const updated: StoredKeyRegistryRecord = ensureFingerprint({
      ...current,
      label: normalizeOptionalString(patch.label) ?? current.label,
      providerHints: patch.providerHints ? normalizeProviderHints(patch.providerHints) : current.providerHints,
      fingerprint: nextFingerprint,
      apiId: patch.apiId === null ? undefined : normalizeOptionalString(patch.apiId) ?? current.apiId,
      baseUrl: patch.baseUrl === null ? undefined : normalizeOptionalString(patch.baseUrl) ?? current.baseUrl,
      model: patch.model === null ? undefined : normalizeOptionalString(patch.model) ?? current.model,
      configName:
        patch.configName === null
          ? undefined
          : normalizeOptionalString(patch.configName) ?? current.configName,
      note: patch.note === null ? undefined : normalizeOptionalString(patch.note) ?? current.note,
      secret: nextSecret,
      updatedAt: nowIso(),
    });

    file.entries[index] = updated;
    await this.writeRegistry(file);

    return publicEntryFromRecord(updated, registryPath);
  }

  async deleteEntry(id: string): Promise<void> {
    const { file } = await this.readRegistry();
    const nextEntries = file.entries.filter((item) => item.id !== id);

    if (nextEntries.length === file.entries.length) {
      throw new Error(`Stored key not found: ${id}`);
    }

    await this.writeRegistry({
      ...file,
      entries: nextEntries,
    });
  }

  async resolveSecret(id: string): Promise<string | undefined> {
    const { file } = await this.readRegistry();
    return file.entries.find((item) => item.id === id)?.secret;
  }

  async touchUsageSync(id: string, apiId: string | undefined, syncedAt: string): Promise<void> {
    const { file } = await this.readRegistry();
    const index = file.entries.findIndex((item) => item.id === id);

    if (index < 0) {
      return;
    }

    file.entries[index] = {
      ...file.entries[index],
      apiId: normalizeOptionalString(apiId) ?? file.entries[index].apiId,
      lastUsageSyncAt: syncedAt,
      updatedAt: nowIso(),
    };

    await this.writeRegistry(file);
  }

  private async readRegistry(): Promise<{ file: StoredKeyRegistryFile; path: string }> {
    const registryPath = await resolveRuntimeStateFile("registry", "keys.local.json");

    try {
      const content = await readFile(registryPath, "utf8");
      const parsed = JSON.parse(content) as Partial<StoredKeyRegistryFile>;
      const entries = Array.isArray(parsed.entries) ? parsed.entries.map(ensureFingerprint) : [];

      return {
        path: registryPath,
        file: {
          version: 1,
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
          entries,
        },
      };
    } catch {
      const initial: StoredKeyRegistryFile = {
        version: 1,
        updatedAt: nowIso(),
        entries: [],
      };

      await writeFile(registryPath, JSON.stringify(initial, null, 2), "utf8");
      return { file: initial, path: registryPath };
    }
  }

  private async writeRegistry(file: StoredKeyRegistryFile): Promise<void> {
    const registryPath = await resolveRuntimeStateFile("registry", "keys.local.json");
    const normalized: StoredKeyRegistryFile = {
      version: 1,
      updatedAt: nowIso(),
      entries: file.entries.map(ensureFingerprint),
    };

    await writeFile(registryPath, JSON.stringify(normalized, null, 2), "utf8");
  }

  private buildUniqueId(file: StoredKeyRegistryFile, baseId: string): string {
    let counter = 1;
    let nextId = baseId;

    while (file.entries.some((item) => item.id === nextId)) {
      counter += 1;
      nextId = `${baseId}-${counter}`;
    }

    return nextId;
  }
}
