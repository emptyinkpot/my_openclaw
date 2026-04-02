import type { KeyProviderHint, StoredKeyCreateInput, StoredKeyUpdateInput } from "../../core/types/stored-key.ts";
import { nowIso } from "../../core/utils/time.ts";
import { KeyRegistryService } from "../services/key-registry-service.ts";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asProviderHints(value: unknown): KeyProviderHint[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(
    (item): item is KeyProviderHint =>
      item === "codex" || item === "roo" || item === "shared",
  );
}

export async function getKeysPayload() {
  const service = new KeyRegistryService();

  return {
    observedAt: nowIso(),
    keys: await service.listEntries(),
  };
}

export async function createKeyPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("A JSON request body is required.");
  }

  const input = body as Record<string, unknown>;
  const payload: StoredKeyCreateInput = {
    id: asString(input.id),
    label: asString(input.label),
    providerHints: asProviderHints(input.providerHints),
    secret: asString(input.secret) ?? "",
    apiId: asString(input.apiId),
    baseUrl: asString(input.baseUrl),
    model: asString(input.model),
    configName: asString(input.configName),
    note: asString(input.note),
  };
  const service = new KeyRegistryService();
  const key = await service.createEntry(payload);

  return {
    observedAt: nowIso(),
    key,
  };
}

export async function updateKeyPayload(id: string, body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("A JSON request body is required.");
  }

  const input = body as Record<string, unknown>;
  const patch: StoredKeyUpdateInput = {
    label: asString(input.label),
    providerHints: asProviderHints(input.providerHints),
    secret: asString(input.secret),
    apiId: input.apiId === null ? null : asString(input.apiId),
    baseUrl: input.baseUrl === null ? null : asString(input.baseUrl),
    model: input.model === null ? null : asString(input.model),
    configName: input.configName === null ? null : asString(input.configName),
    note: input.note === null ? null : asString(input.note),
  };
  const service = new KeyRegistryService();
  const key = await service.updateEntry(id, patch);

  return {
    observedAt: nowIso(),
    key,
  };
}

export async function deleteKeyPayload(id: string) {
  const service = new KeyRegistryService();
  await service.deleteEntry(id);

  return {
    observedAt: nowIso(),
    deleted: true,
    keyId: id,
  };
}
