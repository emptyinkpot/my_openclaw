import { readFile, stat } from "node:fs/promises";

import type { ConfigSnapshot } from "../../core/types/config-snapshot.ts";
import { fingerprintSecret } from "../../core/utils/fingerprint.ts";

const codexConfigPath = "C:/Users/ASUS-KL/.codex/config.toml";
const codexAuthPath = "C:/Users/ASUS-KL/.codex/auth.json";

export interface CodexActiveConfig {
  secret?: string;
  fingerprint?: string;
  baseUrl?: string;
  model?: string;
  configName?: string;
  sourcePath: string;
  configPath: string;
}

function extractTomlString(content: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escapedKey}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1];
}

async function buildMissingSnapshot(
  id: string,
  source: string,
  filePath: string,
  observedAt: string,
  reason: string,
): Promise<ConfigSnapshot> {
  return {
    id,
    provider: "codex",
    source,
    filePath,
    health: "missing",
    observedAt,
    metadata: {
      reason,
    },
  };
}

export class CodexConfigService {
  async collectSnapshots(observedAt: string): Promise<ConfigSnapshot[]> {
    const configSnapshot = await this.collectConfigSnapshot(observedAt);
    const authSnapshot = await this.collectAuthSnapshot(observedAt);

    return [configSnapshot, authSnapshot];
  }

  async readActiveConfig(): Promise<CodexActiveConfig> {
    const [configContent, authContent] = await Promise.all([
      readFile(codexConfigPath, "utf8"),
      readFile(codexAuthPath, "utf8"),
    ]);
    const parsedAuth = JSON.parse(authContent) as {
      OPENAI_API_KEY?: string;
    };

    return {
      secret: parsedAuth.OPENAI_API_KEY,
      fingerprint: fingerprintSecret(parsedAuth.OPENAI_API_KEY),
      baseUrl: extractTomlString(configContent, "base_url"),
      model: extractTomlString(configContent, "model"),
      configName: extractTomlString(configContent, "model_provider"),
      sourcePath: codexAuthPath,
      configPath: codexConfigPath,
    };
  }

  private async collectConfigSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const [content, fileStat] = await Promise.all([
        readFile(codexConfigPath, "utf8"),
        stat(codexConfigPath),
      ]);

      const provider = extractTomlString(content, "model_provider");
      const model = extractTomlString(content, "model");
      const baseUrl = extractTomlString(content, "base_url");
      const preferredAuthMethod = extractTomlString(content, "preferred_auth_method");
      const wireApi = extractTomlString(content, "wire_api");

      return {
        id: "codex-config-toml",
        provider: "codex",
        source: "codex-config",
        filePath: codexConfigPath,
        health: "present",
        baseUrl,
        model,
        configName: provider,
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          preferredAuthMethod: preferredAuthMethod ?? null,
          wireApi: wireApi ?? null,
        },
      };
    } catch (error) {
      return buildMissingSnapshot(
        "codex-config-toml",
        "codex-config",
        codexConfigPath,
        observedAt,
        error instanceof Error ? error.message : "Unknown error while reading Codex config.",
      );
    }
  }

  private async collectAuthSnapshot(observedAt: string): Promise<ConfigSnapshot> {
    try {
      const [content, fileStat] = await Promise.all([
        readFile(codexAuthPath, "utf8"),
        stat(codexAuthPath),
      ]);

      const parsed = JSON.parse(content) as {
        auth_mode?: string;
        OPENAI_API_KEY?: string;
      };

      return {
        id: "codex-auth-json",
        provider: "codex",
        source: "codex-auth",
        filePath: codexAuthPath,
        health: "present",
        keyFingerprint: fingerprintSecret(parsed.OPENAI_API_KEY),
        lastModifiedAt: fileStat.mtime.toISOString(),
        observedAt,
        metadata: {
          authMode: parsed.auth_mode ?? null,
        },
      };
    } catch (error) {
      return buildMissingSnapshot(
        "codex-auth-json",
        "codex-auth",
        codexAuthPath,
        observedAt,
        error instanceof Error ? error.message : "Unknown error while reading Codex auth config.",
      );
    }
  }
}
