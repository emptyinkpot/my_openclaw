import * as fs from 'fs';
import * as path from 'path';
import type { FileManagerConfig, FileManagerRuntimeInfo } from '../../contracts';
import { ManagedFileSystem } from '../../core/file-system';
import { FileWatcher } from '../../core/file-watcher';
import { RulesEngine } from '../../core/rules-engine';

const DEFAULT_MAX_TREE_DEPTH = 1;
const DEFAULT_MAX_ENTRIES_PER_DIRECTORY = 200;
const DEFAULT_MAX_FILE_READ_BYTES = 256 * 1024;

function safeRealPath(targetPath: string): string {
  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  try {
    return fs.realpathSync.native(resolvedPath);
  } catch {
    return fs.realpathSync(resolvedPath);
  }
}

function normalizePathKey(targetPath: string): string {
  return safeRealPath(targetPath).replace(/\\/g, '/').toLowerCase();
}

function resolveProjectRoot(): string {
  return path.resolve(__dirname, '..', '..', '..', '..');
}

function clampInteger(
  value: unknown,
  fallback: number,
  minValue: number,
  maxValue: number
): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minValue, Math.min(maxValue, parsed));
}

function asExistingDirectory(targetPath: unknown): string | null {
  if (typeof targetPath !== 'string' || !targetPath.trim()) {
    return null;
  }

  const resolvedPath = safeRealPath(targetPath.trim());
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    return fs.statSync(resolvedPath).isDirectory() ? resolvedPath : null;
  } catch {
    return null;
  }
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const item of paths) {
    const key = normalizePathKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(safeRealPath(item));
  }

  return results;
}

function isInsideRoot(targetPath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export class FileManagerService {
  private readonly fileSystem: ManagedFileSystem;
  private readonly watcher: FileWatcher;
  private readonly rulesEngine: RulesEngine;
  private readonly runtimeInfo: FileManagerRuntimeInfo;

  constructor(config: FileManagerConfig = {}) {
    const projectRoot = resolveProjectRoot();
    const workspaceRoot = asExistingDirectory(config.workspaceRoot) || projectRoot;

    const allowedRoots = uniquePaths([
      workspaceRoot,
      ...((config.allowedRoots || []).map((item) => asExistingDirectory(item)).filter(Boolean) as string[]),
    ]);

    const watchPaths = uniquePaths(
      (
        (config.watchPaths || []).map((item) => asExistingDirectory(item)).filter(Boolean) as string[]
      ).filter((item) => allowedRoots.some((root) => isInsideRoot(item, root)))
    );

    const finalWatchPaths = watchPaths.length > 0 ? watchPaths : [workspaceRoot];
    const maxTreeDepth = clampInteger(config.maxTreeDepth, DEFAULT_MAX_TREE_DEPTH, 0, 3);
    const maxEntriesPerDirectory = clampInteger(
      config.maxEntriesPerDirectory,
      DEFAULT_MAX_ENTRIES_PER_DIRECTORY,
      20,
      1000
    );
    const maxFileReadBytes = clampInteger(
      config.maxFileReadBytes,
      DEFAULT_MAX_FILE_READ_BYTES,
      8 * 1024,
      2 * 1024 * 1024
    );

    this.fileSystem = new ManagedFileSystem(allowedRoots, workspaceRoot, {
      maxTreeDepth,
      maxEntriesPerDirectory,
      maxFileReadBytes,
    });

    this.rulesEngine = new RulesEngine(config.rules || [], {
      allowShellCommands: Boolean(config.allowShellCommands),
      commandCwd: workspaceRoot,
    });

    this.watcher = new FileWatcher(finalWatchPaths);
    this.watcher.on('change', (event) => {
      this.rulesEngine.processEvent(event);
    });
    this.watcher.start();

    this.runtimeInfo = {
      workspaceRoot,
      allowedRoots: this.fileSystem.getAllowedRoots(),
      watchPaths: finalWatchPaths,
      watcherActive: this.watcher.isRunning(),
      watcherMode: this.watcher.getMode(),
      ruleCount: this.rulesEngine.getActiveRuleCount(),
      allowShellCommands: Boolean(config.allowShellCommands),
      maxTreeDepth,
      maxEntriesPerDirectory,
      maxFileReadBytes,
    };
  }

  getRuntimeInfo(): FileManagerRuntimeInfo {
    return {
      ...this.runtimeInfo,
      allowedRoots: [...this.runtimeInfo.allowedRoots],
      watchPaths: [...this.runtimeInfo.watchPaths],
      watcherActive: this.watcher.isRunning(),
      watcherMode: this.watcher.getMode(),
    };
  }

  getDirectoryTree(targetPath?: string) {
    return this.fileSystem.getDirectoryTree(targetPath || this.runtimeInfo.workspaceRoot);
  }

  readFile(targetPath: string) {
    return this.fileSystem.readFile(targetPath);
  }

  dispose(): void {
    this.watcher.stop();
  }
}

export function createFileManagerService(config: FileManagerConfig = {}): FileManagerService {
  return new FileManagerService(config);
}
