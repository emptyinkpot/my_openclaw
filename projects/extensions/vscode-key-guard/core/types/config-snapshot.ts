export type ProviderKind = "codex" | "roo" | "vscode";

export type SnapshotHealth = "present" | "missing" | "invalid";

export interface ConfigSnapshot {
  id: string;
  provider: ProviderKind;
  source: string;
  filePath?: string;
  health: SnapshotHealth;
  keyFingerprint?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  lastModifiedAt?: string;
  observedAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface SnapshotCollection {
  observedAt: string;
  snapshots: ConfigSnapshot[];
}
