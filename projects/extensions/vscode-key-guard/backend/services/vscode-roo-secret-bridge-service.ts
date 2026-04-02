import { stat } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const vscodeStateDbPath =
  "C:/Users/ASUS-KL/AppData/Roaming/Code/User/globalStorage/state.vscdb";
const rooStateOwner = "RooVeterinaryInc.roo-cline";
const rooOpenAiSecretKey =
  'secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"openAiApiKey"}';
const rooProfileSecretKey =
  'secret://{"extensionId":"rooveterinaryinc.roo-cline","key":"roo_cline_config_api_config"}';

type StateDbJsonRow = {
  value: Uint8Array | string;
};

type RooStateRecord = {
  currentApiConfigName?: string;
  openAiBaseUrl?: string;
  openAiModelId?: string;
};

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
  const row = db
    .prepare("SELECT value FROM ItemTable WHERE key = ?")
    .get(key) as StateDbJsonRow | undefined;

  if (!row?.value) {
    return undefined;
  }

  const text = typeof row.value === "string"
    ? row.value
    : Buffer.from(row.value).toString("utf8");

  return JSON.parse(text) as T;
}

function readBlobLength(db: DatabaseSync, key: string): number {
  const row = db
    .prepare("SELECT length(value) AS len FROM ItemTable WHERE key = ?")
    .get(key) as { len?: number | null } | undefined;

  return typeof row?.len === "number" ? row.len : 0;
}

export class VscodeRooSecretBridgeService {
  async readActiveConfig(): Promise<{
    secret?: string;
    baseUrl?: string;
    model?: string;
    configName?: string;
    sourcePath: string;
    configPath: string;
  }> {
    const state = withStateDb((db) =>
      readJsonRow<RooStateRecord>(db, rooStateOwner)
    );

    return {
      secret: undefined,
      baseUrl: asOptionalString(state?.openAiBaseUrl),
      model: asOptionalString(state?.openAiModelId),
      configName: asOptionalString(state?.currentApiConfigName),
      sourcePath: vscodeStateDbPath,
      configPath: vscodeStateDbPath,
    };
  }

  async readRooSecretSnapshotMeta(): Promise<{
    health: "present" | "missing" | "invalid";
    keyFingerprint?: string;
    configName?: string;
    baseUrl?: string;
    model?: string;
    bridgeRequired: boolean;
    bridgeStatus: "unavailable";
    openAiApiKeyBytes?: number;
    profileBlobBytes?: number;
    reason?: string;
  }> {
    await stat(vscodeStateDbPath);

    const state = withStateDb((db) => {
      const rooState = readJsonRow<RooStateRecord>(db, rooStateOwner);
      const openAiApiKeyBytes = readBlobLength(db, rooOpenAiSecretKey);
      const profileBlobBytes = readBlobLength(db, rooProfileSecretKey);

      return {
        rooState,
        openAiApiKeyBytes,
        profileBlobBytes,
      };
    });

    const hasSecretRows =
      state.openAiApiKeyBytes > 0 || state.profileBlobBytes > 0;

    return {
      health: hasSecretRows ? "present" : "missing",
      configName: asOptionalString(state.rooState?.currentApiConfigName),
      baseUrl: asOptionalString(state.rooState?.openAiBaseUrl),
      model: asOptionalString(state.rooState?.openAiModelId),
      bridgeRequired: true,
      bridgeStatus: "unavailable",
      openAiApiKeyBytes: state.openAiApiKeyBytes,
      profileBlobBytes: state.profileBlobBytes,
      reason:
        "Roo Secret bridge implementation is missing in this build, so reads stay metadata-only and writes remain blocked.",
    };
  }

  async switchActiveKey(): Promise<{
    wroteFiles: string[];
    backupFiles: string[];
    reloadRequired: boolean;
  }> {
    throw new Error(
      "Roo Secret bridge implementation is unavailable, so controlled Roo key switching is blocked.",
    );
  }
}
