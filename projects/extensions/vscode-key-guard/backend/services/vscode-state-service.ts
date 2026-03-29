import { stat } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot";

const vscodeStateDbPath = "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/state.vscdb";
const rooStoragePath = "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline";

export class VscodeStateService {
  async collectSnapshots(observedAt: string): Promise<ConfigSnapshot[]> {
    const stateDbSnapshot = await this.collectStateDbSnapshot(observedAt);
    const rooStorageSnapshot = await this.collectRooStorageSnapshot(observedAt);

    return [stateDbSnapshot, rooStorageSnapshot];
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
}
