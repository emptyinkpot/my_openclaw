import { readFile, stat } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot";
import { fingerprintSecret } from "../../core/utils/fingerprint";

const rooEnvPath = "C:/Users/ASUS-KL/.roo/.env.local";

function extractEnvValue(content: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escapedKey}=(.*)$`, "m"));
  return match?.[1]?.trim();
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
}
