import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = fileURLToPath(new URL("../../", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const legacyStateRoot = path.join(moduleRoot, "state");
const runtimeRoot = path.join(workspaceRoot, ".runtime", "extensions", "vscode-key-guard");
const runtimeStateRoot = path.join(runtimeRoot, "state");

async function resolveRuntimeFile(scope: "state" | "cache" | "logs" | "temp", ...segments: string[]) {
  const runtimePath = path.join(runtimeRoot, scope, ...segments);
  const legacyPath = scope === "state" ? path.join(legacyStateRoot, ...segments) : null;

  await mkdir(path.dirname(runtimePath), { recursive: true });

  if (legacyPath && !existsSync(runtimePath) && existsSync(legacyPath) && legacyPath !== runtimePath) {
    await copyFile(legacyPath, runtimePath);
  }

  return runtimePath;
}

export async function resolveRuntimeStateFile(...segments: string[]): Promise<string> {
  return resolveRuntimeFile("state", ...segments);
}

export async function resolveRuntimeCacheFile(...segments: string[]): Promise<string> {
  return resolveRuntimeFile("cache", ...segments);
}

export async function resolveRuntimeLogFile(...segments: string[]): Promise<string> {
  return resolveRuntimeFile("logs", ...segments);
}

export async function resolveRuntimeTempFile(...segments: string[]): Promise<string> {
  return resolveRuntimeFile("temp", ...segments);
}

export async function createRuntimeBackup(
  sourceFile: string,
  namespace = "config",
): Promise<string | undefined> {
  if (!existsSync(sourceFile)) {
    return undefined;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = await resolveRuntimeStateFile(
    "backups",
    namespace,
    `${stamp}-${path.basename(sourceFile)}`,
  );

  await copyFile(sourceFile, backupPath);
  return backupPath;
}
