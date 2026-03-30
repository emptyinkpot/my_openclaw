import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import type { StoredKeyEntry } from "../../core/types/stored-key.ts";
import { createRuntimeBackup } from "./runtime-state-paths.ts";

const codexConfigPath = "C:/Users/ASUS-KL/.codex/config.toml";
const codexAuthPath = "C:/Users/ASUS-KL/.codex/auth.json";

function escapeTomlKey(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeTomlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function extractTomlString(content: string, key: string): string | undefined {
  const escapedKey = escapeTomlKey(key);
  const match = content.match(new RegExp(`^${escapedKey}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1];
}

function upsertTopLevelToml(content: string, key: string, value: string): string {
  const line = `${key} = "${escapeTomlString(value)}"`;
  const escapedKey = escapeTomlKey(key);
  const pattern = new RegExp(`^${escapedKey}\\s*=\\s*"[^"]*"`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  return `${content.trimEnd()}\n${line}\n`;
}

function upsertSectionToml(content: string, sectionName: string, key: string, value: string): string {
  const sectionHeader = `[model_providers.${sectionName}]`;
  const line = `${key} = "${escapeTomlString(value)}"`;
  const sectionIndex = content.indexOf(sectionHeader);

  if (sectionIndex < 0) {
    return `${content.trimEnd()}\n\n${sectionHeader}\nname = "${escapeTomlString(sectionName)}"\n${line}\n`;
  }

  const nextSectionIndex = content.indexOf("\n[", sectionIndex + sectionHeader.length);
  const sectionEnd = nextSectionIndex >= 0 ? nextSectionIndex : content.length;
  const sectionBody = content.slice(sectionIndex, sectionEnd);
  const escapedKey = escapeTomlKey(key);
  const pattern = new RegExp(`^${escapedKey}\\s*=\\s*"[^"]*"`, "m");

  if (pattern.test(sectionBody)) {
    const updatedSection = sectionBody.replace(pattern, line);
    return `${content.slice(0, sectionIndex)}${updatedSection}${content.slice(sectionEnd)}`;
  }

  const updatedSection = `${sectionBody.trimEnd()}\n${line}\n`;
  return `${content.slice(0, sectionIndex)}${updatedSection}${content.slice(sectionEnd)}`;
}

export class CodexWriteService {
  async switchTo(entry: StoredKeyEntry, secret: string): Promise<{
    wroteFiles: string[];
    backupFiles: string[];
    reloadRequired: boolean;
  }> {
    await mkdir(path.dirname(codexAuthPath), { recursive: true });

    const wroteFiles: string[] = [];
    const backupFiles = [await createRuntimeBackup(codexAuthPath, "codex")].filter(
      (value): value is string => Boolean(value),
    );

    const currentAuth = await this.readJsonFile<Record<string, unknown>>(codexAuthPath);
    const nextAuth = {
      ...(currentAuth ?? {}),
      auth_mode: "apikey",
      OPENAI_API_KEY: secret,
    };

    await writeFile(codexAuthPath, `${JSON.stringify(nextAuth, null, 2)}\n`, "utf8");
    wroteFiles.push(codexAuthPath);

    if (entry.baseUrl || entry.model || entry.configName) {
      const backup = await createRuntimeBackup(codexConfigPath, "codex");
      if (backup) {
        backupFiles.push(backup);
      }

      let configContent = existsSync(codexConfigPath)
        ? await readFile(codexConfigPath, "utf8")
        : "";

      const providerName =
        entry.configName ??
        extractTomlString(configContent, "model_provider") ??
        "default";

      if (entry.configName) {
        configContent = upsertTopLevelToml(configContent, "model_provider", entry.configName);
      }

      if (entry.model) {
        configContent = upsertTopLevelToml(configContent, "model", entry.model);
      }

      if (entry.baseUrl) {
        configContent = upsertSectionToml(configContent, providerName, "base_url", entry.baseUrl);
      }

      if (configContent.length > 0) {
        await writeFile(codexConfigPath, `${configContent.trimEnd()}\n`, "utf8");
        wroteFiles.push(codexConfigPath);
      }
    }

    return {
      wroteFiles,
      backupFiles,
      reloadRequired: false,
    };
  }

  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await readFile(filePath, "utf8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }
}
