import { readFile, stat } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import { fingerprintSecret } from "../../core/utils/fingerprint.ts";

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
            reason: error instanceof Error ? error.message : "Unknown error while reading Roo env file.",
          },
        },
      ];
    }
  }

  async readActiveConfig(): Promise<RooActiveConfig> {
    const content = await readFile(rooEnvPath, "utf8");
    const apiKey = extractEnvValue(content, "OPENAI_API_KEY");
    const baseUrl = extractEnvValue(content, "OPENAI_BASE_URL");
    const model = extractEnvValue(content, "OPENAI_MODEL");
    const configName = extractEnvValue(content, "ROO_CODE_CONFIG_NAME");

    return {
      secret: apiKey,
      fingerprint: fingerprintSecret(apiKey),
      baseUrl,
      model,
      configName,
      sourcePath: rooEnvPath,
      configPath: rooEnvPath,
    };
  }
}
