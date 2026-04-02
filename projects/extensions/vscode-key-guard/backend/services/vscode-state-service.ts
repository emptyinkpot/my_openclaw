import { readFile, stat } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import { VscodeRooSecretBridgeService } from "./vscode-roo-secret-bridge-service.ts";

const vscodeStateDbPath = "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/state.vscdb";
const rooStoragePath = "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline";
const rooTaskIndexPath = `${rooStoragePath}/tasks/_index.json`;
const rooStateOwner = "RooVeterinaryInc.roo-cline";
const rooOpenAiSecretKey = 'secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"openAiApiKey"}';
const rooProfileSecretKey = 'secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"roo_cline_config_api_config"}';

type RooTaskIndexEntry = {
  id?: string;
  ts?: number;
  workspace?: string;
  mode?: string;
  apiConfigName?: string;
};

type RooTaskIndexFile = {
  updatedAt?: number;
  entries?: RooTaskIndexEntry[];
};

type StateDbJsonRow = {
  value: Uint8Array | string;
};

type RooStateRecord = {
  currentApiConfigName?: string;
  listApiConfigMeta?: Array<Record<string, unknown>>;
  apiProvider?: string;
  openAiBaseUrl?: string;
  openAiModelId?: string;
};

function normalizeWorkspace(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/\\/g, "/").toLowerCase();
}

function getBestWorkspaceMatch<T extends { workspace?: string }>(
  entries: T[],
  currentWorkspace: string | undefined,
): T | undefined {
  if (!currentWorkspace) {
    return undefined;
  }

  let bestMatch: T | undefined;
  let bestLength = -1;

  for (const entry of entries) {
    const workspace = normalizeWorkspace(entry.workspace);
    if (!workspace) {
      continue;
    }

    const prefix = workspace.endsWith("/") ? workspace : `${workspace}/`;
    const matches = currentWorkspace === workspace || currentWorkspace.startsWith(prefix);
    if (!matches || workspace.length <= bestLength) {
      continue;
    }

    bestMatch = entry;
    bestLength = workspace.length;
  }

  return bestMatch;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function withStateDb<T>(callback: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(vscodeStateDbPath, { readonly: true });

  try {
    return callback(db);
  } finally {
    db.close();
  }
}

function readJsonRow<T>(db: DatabaseSync, key: string): T | undefined {
  const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(key) as StateDbJsonRow | undefined;

  if (!row?.value) {
    return undefined;
  }

  const text = typeof row.value === "string"
    ? row.value
    : Buffer.from(row.value).toString("utf8");

  return JSON.parse(text) as T;
}

function readBlobLength(db: DatabaseSync, key: string): number | undefined {
  const row = db.prepare("SELECT length(value) AS len FROM ItemTable WHERE key = ?").get(key) as
    | { len?: number | null }
    | undefined;

  return typeof row?.len === "number" ? row.len : undefined;
}

export class VscodeStateService {
  private readonly rooSecretBridgeService: VscodeRooSecretBridgeService;

  constructor(rooSecretBridgeService = new VscodeRooSecretBridgeService()) {
    this.rooSecretBridgeService = rooSecretBridgeService;
  }

  async collectSnapshots(observedAt: string): Promise<ConfigSnapshot[]> {
    const stateDbSnapshot = await this.collectStateDbSnapshot(observedAt);
    const rooStorageSnapshot = await this.collectRooStorageSnapshot(observedAt);
    const rooTaskIndexSnapshot = await this.collectRooTaskIndexSnapshot(observedAt);
    const rooStateDbSnapshot = await this.collectRooStateDbSnapshot(observedAt);
    const rooSecretStorageSnapshot = await this.collectRooSecretStorageSnapshot(observedAt);

    return [
      stateDbSnapshot,
      rooStorageSnapshot,
      rooTaskIndexSnapshot,
      rooStateDbSnapshot,
      rooSecretStorageSnapshot,
    ];
  }

  private async collectStateDbSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const fileStat = await stat(vscodeStateDbPath);

      return {
        id: "vscode-global-storage-db",
        provider: "vscode",
        source: "vscode-global-storage-db",
        filePath: vscodeStateDbPath,
        health: "present",
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          reader: "stat-only",
          note: "SQLite probing is deferred; current stage confirms presence and recency only.",
          sizeBytes: fileStat.size,
        },
      };
    } catch (error) {
      return {
        id: "vscode-global-storage-db",
        provider: "vscode",
        source: "vscode-global-storage-db",
        filePath: vscodeStateDbPath,
        health: "missing",
        observedAt,
        metadata: {
          reason: error instanceof Error ? error.message : "Unknown error while probing VS Code state DB.",
        },
      };
    }
  }

  private async collectRooStorageSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const fileStat = await stat(rooStoragePath);

      return {
        id: "vscode-roo-storage-dir",
        provider: "vscode",
        source: "vscode-roo-storage-dir",
        filePath: rooStoragePath,
        health: "present",
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          reader: "stat-only",
          note: "Directory-level evidence for Roo extension state.",
          isDirectory: fileStat.isDirectory(),
        },
      };
    } catch (error) {
      return {
        id: "vscode-roo-storage-dir",
        provider: "vscode",
        source: "vscode-roo-storage-dir",
        filePath: rooStoragePath,
        health: "missing",
        observedAt,
        metadata: {
          reason: error instanceof Error ? error.message : "Unknown error while probing Roo VS Code storage.",
        },
      };
    }
  }

  private async collectRooTaskIndexSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const [content, fileStat] = await Promise.all([
        readFile(rooTaskIndexPath, "utf8"),
        stat(rooTaskIndexPath),
      ]);
      const parsed = JSON.parse(content) as RooTaskIndexFile;
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const currentWorkspace = normalizeWorkspace(process.cwd());
      const matchingWorkspaceEntry = getBestWorkspaceMatch(entries, currentWorkspace);
      const latestEntry = matchingWorkspaceEntry ?? entries[0];
      const configNames = new Set(
        entries
          .map((entry) => entry.apiConfigName)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      );

      return {
        id: "vscode-roo-task-index",
        provider: "roo",
        source: "vscode-roo-task-index",
        filePath: rooTaskIndexPath,
        health: latestEntry ? "present" : "invalid",
        configName: latestEntry?.apiConfigName,
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          reader: "task-index",
          matchedWorkspace: Boolean(matchingWorkspaceEntry),
          entryCount: entries.length,
          configNameCount: configNames.size,
          selectedTaskId: latestEntry?.id ?? null,
          selectedWorkspace: latestEntry?.workspace ?? null,
          selectedMode: latestEntry?.mode ?? null,
          selectedTaskTs: latestEntry?.ts ?? null,
          storageUpdatedAt: parsed.updatedAt ?? null,
        },
      };
    } catch (error) {
      return {
        id: "vscode-roo-task-index",
        provider: "roo",
        source: "vscode-roo-task-index",
        filePath: rooTaskIndexPath,
        health: "missing",
        observedAt,
        metadata: {
          reason: error instanceof Error ? error.message : "Unknown error while reading Roo task index.",
        },
      };
    }
  }

  private async collectRooStateDbSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const fileStat = await stat(vscodeStateDbPath);
      const state = withStateDb((db) => readJsonRow<RooStateRecord>(db, rooStateOwner));

      if (!state) {
        return {
          id: "vscode-roo-state-db",
          provider: "roo",
          source: "vscode-roo-state-db",
          filePath: vscodeStateDbPath,
          health: "invalid",
          lastModifiedAt: fileStat.mtime.toISOString(),
          observedAt,
          metadata: {
            reader: "sqlite-item",
            reason: "Roo global state row was not found in ItemTable.",
          },
        };
      }

      const configName = asOptionalString(state.currentApiConfigName);
      const apiProvider = asOptionalString(state.apiProvider);
      const listApiConfigMeta = Array.isArray(state.listApiConfigMeta) ? state.listApiConfigMeta : [];
      const currentProfileMeta = listApiConfigMeta.find(
        (item) => asOptionalString(item.name) === configName,
      );
      const currentProfileId = currentProfileMeta
        ? asOptionalString(currentProfileMeta.id)
        : undefined;
      const baseUrl = asOptionalString(state.openAiBaseUrl);
      const model = asOptionalString(state.openAiModelId) ?? asOptionalString(currentProfileMeta?.modelId);

      return {
        id: "vscode-roo-state-db",
        provider: "roo",
        source: "vscode-roo-state-db",
        filePath: vscodeStateDbPath,
        health: configName ? "present" : "invalid",
        configName,
        baseUrl,
        model,
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          reader: "sqlite-item",
          ownerMatched: true,
          apiProvider: apiProvider ?? null,
          currentConfigId: currentProfileId ?? null,
          listApiConfigMetaCount: listApiConfigMeta.length,
          note: "Read from ItemTable row RooVeterinaryInc.roo-cline; active secrets remain in SecretStorage rows.",
        },
      };
    } catch (error) {
      return {
        id: "vscode-roo-state-db",
        provider: "roo",
        source: "vscode-roo-state-db",
        filePath: vscodeStateDbPath,
        health: "missing",
        observedAt,
        metadata: {
          reason: error instanceof Error ? error.message : "Unknown error while probing Roo state from VS Code DB.",
        },
      };
    }
  }

  private async collectRooSecretStorageSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const fileStat = await stat(vscodeStateDbPath);
      const secretState = await this.rooSecretBridgeService.readRooSecretSnapshotMeta();

      return {
        id: "vscode-roo-secret-storage",
        provider: "roo",
        source: "vscode-roo-secret-storage",
        filePath: vscodeStateDbPath,
        health: secretState.health,
        keyFingerprint: secretState.keyFingerprint,
        configName: secretState.configName,
        baseUrl: secretState.baseUrl,
        model: secretState.model,
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          reader: "sqlite-secret-row",
          encrypted: true,
          bridgeRequired: secretState.bridgeRequired,
          bridgeStatus: secretState.bridgeStatus,
          openAiApiKeyBytes: secretState.openAiApiKeyBytes ?? 0,
          profileBlobBytes: secretState.profileBlobBytes ?? 0,
          note: secretState.bridgeRequired
            ? secretState.reason ?? "Roo secrets are present as encrypted SecretStorage rows but the bridge is unavailable."
            : "Roo secrets were decrypted through the local VS Code Secret bridge.",
        },
      };
    } catch (error) {
      return {
        id: "vscode-roo-secret-storage",
        provider: "roo",
        source: "vscode-roo-secret-storage",
        filePath: vscodeStateDbPath,
        health: "missing",
        observedAt,
        metadata: {
          reason: error instanceof Error ? error.message : "Unknown error while probing Roo SecretStorage rows.",
        },
      };
    }
  }
}
