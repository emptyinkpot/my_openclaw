export type KeyProviderHint = "codex" | "roo" | "shared";

export interface StoredKeyEntry {
  id: string;
  label: string;
  providerHints: KeyProviderHint[];
  fingerprint: string;
  apiId?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  note?: string;
  secretRef: string;
  createdAt: string;
  updatedAt: string;
  lastUsageSyncAt?: string;
  lastUsedAt?: string;
}

export interface StoredKeyCreateInput {
  id?: string;
  label?: string;
  providerHints?: KeyProviderHint[];
  secret: string;
  apiId?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  note?: string;
}

export interface StoredKeyUpdateInput {
  label?: string;
  providerHints?: KeyProviderHint[];
  secret?: string;
  apiId?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  configName?: string | null;
  note?: string | null;
}

export interface StoredKeyRegistryRecord extends Omit<StoredKeyEntry, "secretRef"> {
  secret: string;
  secretRef?: string;
}

export interface StoredKeyRegistryFile {
  version: 1;
  updatedAt: string;
  entries: StoredKeyRegistryRecord[];
}
