import { readFile } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import type { DiagnosisResult } from "../../core/types/diagnosis.ts";
import type { ProviderActiveStatus } from "../../core/types/provider-status.ts";
import type { StoredKeyEntry } from "../../core/types/stored-key.ts";
import { AuditService } from "./audit-service.ts";
import { KeyRegistryService } from "./key-registry-service.ts";
import { resolveRuntimeCacheFile } from "./runtime-state-paths.ts";

type ProviderName = "codex" | "roo";

const PROVIDER_CONFIG: Record<ProviderName, {
  keySnapshotId: string;
  configSnapshotId: string;
  runtimeSnapshotIds: string[];
}> = {
  codex: {
    keySnapshotId: "codex-auth-json",
    configSnapshotId: "codex-config-toml",
    runtimeSnapshotIds: [],
  },
  roo: {
    keySnapshotId: "vscode-roo-secret-storage",
    configSnapshotId: "vscode-roo-state-db",
    runtimeSnapshotIds: ["vscode-roo-task-index"],
  },
};

function filterKeysForProvider(
  keys: StoredKeyEntry[],
  provider: ProviderName,
): StoredKeyEntry[] {
  return keys.filter(
    (entry) => entry.providerHints.includes("shared") || entry.providerHints.includes(provider),
  );
}

async function readUsageCacheEntry(provider: ProviderName, fingerprint: string | undefined) {
  if (!fingerprint) {
    return undefined;
  }

  const cachePath = await resolveRuntimeCacheFile("usage-cache.json");

  try {
    const content = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(content) as {
      entries?: Record<string, { apiId?: string }>;
    };

    return parsed.entries?.[`active:${provider}:${fingerprint}`];
  } catch {
    return undefined;
  }
}

export class ProviderStatusService {
  private readonly keyRegistryService: KeyRegistryService;
  private readonly auditService: AuditService;

  constructor(
    keyRegistryService = new KeyRegistryService(),
    auditService = new AuditService(),
  ) {
    this.keyRegistryService = keyRegistryService;
    this.auditService = auditService;
  }

  async buildStatuses(
    snapshots: ConfigSnapshot[],
    diagnosis: DiagnosisResult,
  ): Promise<ProviderActiveStatus[]> {
    const keys = await this.keyRegistryService.listEntries();
    const providers: ProviderName[] = ["codex", "roo"];

    return Promise.all(
      providers.map((provider) => this.buildStatus(provider, snapshots, diagnosis, keys)),
    );
  }

  async buildStatus(
    provider: ProviderName,
    snapshots: ConfigSnapshot[],
    diagnosis: DiagnosisResult,
    keys?: StoredKeyEntry[],
  ): Promise<ProviderActiveStatus> {
    const registryEntries = keys ?? await this.keyRegistryService.listEntries();
    const config = PROVIDER_CONFIG[provider];
    const keySnapshot = snapshots.find((item) => item.id === config.keySnapshotId);
    const configSnapshot = snapshots.find((item) => item.id === config.configSnapshotId) ?? keySnapshot;
    const runtimeSnapshots = config.runtimeSnapshotIds
      .map((id) => snapshots.find((item) => item.id === id))
      .filter((item): item is ConfigSnapshot => Boolean(item));
    const evidence = diagnosis.evidence.filter(
      (item) =>
        item.snapshotId === config.keySnapshotId ||
        item.snapshotId === config.configSnapshotId ||
        config.runtimeSnapshotIds.includes(item.snapshotId),
    );
    const matchedEntry = await this.keyRegistryService.getEntryByFingerprint(keySnapshot?.keyFingerprint);
    const latestSwitch = await this.auditService.readLatestSwitchEvent(provider);
    const providerKeys = filterKeysForProvider(registryEntries, provider);
    const cachedUsage = await readUsageCacheEntry(provider, keySnapshot?.keyFingerprint);

    return {
      provider,
      activeKeyFingerprint: keySnapshot?.keyFingerprint,
      activeKeyId: matchedEntry?.id,
      activeLabel: matchedEntry?.label,
      apiId: matchedEntry?.apiId ?? cachedUsage?.apiId,
      baseUrl: configSnapshot?.baseUrl ?? matchedEntry?.baseUrl,
      model: configSnapshot?.model ?? matchedEntry?.model,
      configName: configSnapshot?.configName ?? matchedEntry?.configName,
      sourcePath: keySnapshot?.filePath,
      configPath: configSnapshot?.filePath,
      runtimeAligned:
        (keySnapshot?.health === "present" || provider === "codex") &&
        evidence.length === 0,
      registryMatch: keySnapshot?.keyFingerprint
        ? matchedEntry
          ? "matched"
          : "untracked"
        : "missing",
      observedAt: diagnosis.observedAt,
      candidateKeyCount: providerKeys.length,
      runtimeSources: runtimeSnapshots
        .map((item) => item.filePath)
        .filter((value): value is string => Boolean(value)),
      evidence,
      lastSwitchAt: latestSwitch?.switchedAt,
      lastSwitchTargetKeyId: latestSwitch?.toKeyId,
      lastSwitchAuditId: latestSwitch?.auditId,
    };
  }
}
