import { readFile, stat } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import { fingerprintSecret } from "../../core/utils/fingerprint.ts";
import { VscodeRooSecretBridgeService } from "./vscode-roo-secret-bridge-service.ts";

const rooEnvPath = "C:/Users/ASUS-KL/.roo/.env.local";

export interface RooActiveConfig {
  secret?: string;
  fingerprint?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  sourcePath: string;
  configPath: string;
}

function extractEnvValue(content: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const inlineMatch = content.match(new RegExp(`(?:^|\\s)${escapedKey}=([^\\s]+)`));
  return inlineMatch?.[1]?.trim();
}

export class RooConfigService {
  private readonly rooSecretBridgeService: VscodeRooSecretBridgeService;

  constructor(rooSecretBridgeService = new VscodeRooSecretBridgeService()) {
    this.rooSecretBridgeService = rooSecretBridgeService;
  }

  // Candidate-only reader for legacy or import scenarios.
  // Active Roo state on this machine is modeled through VS Code state + SecretStorage.
  async collectSnapshots(observedAt: string): Promise<ConfigSnapshot[]> {
    try {
      const [content, fileStat] = await Promise.all([
        readFile(rooEnvPath, "utf8"),
        stat(rooEnvPath),
      ]);

      const apiKey = extractEnvValue(content, "OPENAI_API_KEY");
      const baseUrl = extractEnvValue(content, "OPENAI_BASE_URL");
      const model = extractEnvValue(content, "OPENAI_MODEL");
      const configName = extractEnvValue(content, "ROO_CODE_CONFIG_NAME");

      return [
        {
          id: "roo-env-local",
          provider: "roo",
          source: "roo-env-local",
          filePath: rooEnvPath,
          health: "present",
          keyFingerprint: fingerprintSecret(apiKey),
          baseUrl,
          model,
          configName,
          lastModifiedAt: fileStat.mtime.toISOString(),
          observedAt,
          metadata: {
            reader: "env-file",
            sourceRole: "candidate-only",
          },
        },
      ];
    } catch (error) {
      return [
        {
          id: "roo-env-local",
          provider: "roo",
          source: "roo-env-local",
          filePath: rooEnvPath,
          health: "missing",
          observedAt,
          metadata: {
            sourceRole: "candidate-only",
            reason: error instanceof Error ? error.message : "Unknown error while reading Roo env file.",
          },
        },
      ];
    }
  }

  async readActiveConfig(): Promise<RooActiveConfig> {
    const active = await this.rooSecretBridgeService.readActiveConfig();

    return {
      secret: active.secret,
      fingerprint: fingerprintSecret(active.secret),
      baseUrl: active.baseUrl,
      model: active.model,
      configName: active.configName,
      sourcePath: active.sourcePath,
      configPath: active.configPath,
    };
  }
}
