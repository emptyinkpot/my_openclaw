import { readFile, stat } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";

const vscodeStateDbPath = "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/state.vscdb";
const rooStoragePath = "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline";
const rooTaskIndexPath = `${rooStoragePath}/tasks/_index.json`;
const rooStateOwner = "RooVeterinaryInc.roo-cline";

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

function normalizeWorkspace(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/\\/g, "/").toLowerCase();
}

function extractJsonStringField(block: string, fieldName: string): string | undefined {
  const keyTokens = [`"${fieldName}":"`, `${fieldName}\":\"`];

  for (const keyToken of keyTokens) {
    const start = block.indexOf(keyToken);

    if (start < 0) {
      continue;
    }

    const valueStart = start + keyToken.length;
    const terminator = keyToken.includes("\\\"") ? "\\\"" : '"';
    const valueEnd = block.indexOf(terminator, valueStart);

    if (valueEnd < 0) {
      continue;
    }

    return block.slice(valueStart, valueEnd);
  }

  return undefined;
}

export class VscodeStateService {
  async collectSnapshots(observedAt: string): Promise<ConfigSnapshot[]> {
    const stateDbSnapshot = await this.collectStateDbSnapshot(observedAt);
    const rooStorageSnapshot = await this.collectRooStorageSnapshot(observedAt);
    const rooTaskIndexSnapshot = await this.collectRooTaskIndexSnapshot(observedAt);
    const rooStateDbSnapshot = await this.collectRooStateDbSnapshot(observedAt);

    return [stateDbSnapshot, rooStorageSnapshot, rooTaskIndexSnapshot, rooStateDbSnapshot];
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
      const matchingWorkspaceEntry = entries.find(
        (entry) => normalizeWorkspace(entry.workspace) === currentWorkspace,
      );
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
      const [buffer, fileStat] = await Promise.all([
        readFile(vscodeStateDbPath),
        stat(vscodeStateDbPath),
      ]);
      const text = buffer.toString("utf8");
      const ownerIndex = text.indexOf(rooStateOwner);
      const currentConfigIndex = ownerIndex >= 0
        ? text.indexOf("currentApiConfigName", ownerIndex)
        : text.indexOf("currentApiConfigName");

      if (currentConfigIndex < 0) {
        return {
          id: "vscode-roo-state-db",
          provider: "roo",
          source: "vscode-roo-state-db",
          filePath: vscodeStateDbPath,
          health: "invalid",
          lastModifiedAt: fileStat.mtime.toISOString(),
          observedAt,
          metadata: {
            reader: "utf8-probe",
            reason: "currentApiConfigName was not found in the VS Code global state database text view.",
          },
        };
      }

      const probeWindow = text.slice(currentConfigIndex, currentConfigIndex + 800);
      const configName = extractJsonStringField(probeWindow, "currentApiConfigName");
      const apiProvider = extractJsonStringField(probeWindow, "apiProvider");

      return {
        id: "vscode-roo-state-db",
        provider: "roo",
        source: "vscode-roo-state-db",
        filePath: vscodeStateDbPath,
        health: configName ? "present" : "invalid",
        configName,
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          reader: "utf8-probe",
          ownerMatched: ownerIndex >= 0,
          apiProvider: apiProvider ?? null,
          note: "Extracted from the readable JSON fragment embedded in state.vscdb without mutating the database.",
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
}
