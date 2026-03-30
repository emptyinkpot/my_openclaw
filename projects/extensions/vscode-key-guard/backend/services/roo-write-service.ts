import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StoredKeyEntry } from "../../core/types/stored-key.ts";
import { createRuntimeBackup } from "./runtime-state-paths.ts";

const rooEnvPath = "C:/Users/ASUS-KL/.roo/.env.local";

function upsertEnvVariable(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedKey}=.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  return `${content.trimEnd()}\n${line}\n`;
}

export class RooWriteService {
  async switchTo(entry: StoredKeyEntry, secret: string): Promise<{
    wroteFiles: string[];
    backupFiles: string[];
    reloadRequired: boolean;
  }> {
    await mkdir(path.dirname(rooEnvPath), { recursive: true });

    const backupFiles = [await createRuntimeBackup(rooEnvPath, "roo")].filter(
      (value): value is string => Boolean(value),
    );

    let content = "";
    try {
      content = await readFile(rooEnvPath, "utf8");
    } catch {
      content = "";
    }

    content = upsertEnvVariable(content, "OPENAI_API_KEY", secret);

    if (entry.baseUrl) {
      content = upsertEnvVariable(content, "OPENAI_BASE_URL", entry.baseUrl);
    }

    if (entry.model) {
      content = upsertEnvVariable(content, "OPENAI_MODEL", entry.model);
    }

    if (entry.configName) {
      content = upsertEnvVariable(content, "ROO_CODE_CONFIG_NAME", entry.configName);
    }

    await writeFile(rooEnvPath, `${content.trimEnd()}\n`, "utf8");

    return {
      wroteFiles: [rooEnvPath],
      backupFiles,
      reloadRequired: true,
    };
  }
}
