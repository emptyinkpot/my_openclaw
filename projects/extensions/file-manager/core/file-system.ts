import * as fs from 'fs';
import * as path from 'path';
import type { FileManagerFilePreview, FileManagerTreeNode } from '../contracts';

const DEFAULT_IGNORED_NAMES = ['.git', '.idea', '.vs', 'node_modules', 'dist'];

export interface ManagedFileSystemOptions {
  maxTreeDepth: number;
  maxEntriesPerDirectory: number;
  maxFileReadBytes: number;
  ignoredNames?: string[];
}

function normalizePathKey(targetPath: string): string {
  return path.resolve(targetPath).replace(/\\/g, '/').toLowerCase();
}

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

function isInsideRoot(targetPath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export class ManagedFileSystem {
  private readonly allowedRoots: string[];
  private readonly primaryRoot: string;
  private readonly options: ManagedFileSystemOptions;
  private readonly ignoredNames: Set<string>;

  constructor(allowedRoots: string[], primaryRoot: string, options: ManagedFileSystemOptions) {
    const normalizedRoots = Array.from(
      new Set(allowedRoots.map((item) => normalizePathKey(item)))
    ).map((key) => {
      const matched = allowedRoots.find((item) => normalizePathKey(item) === key);
      return safeRealPath(matched || primaryRoot);
    });

    this.allowedRoots = normalizedRoots;
    this.primaryRoot = safeRealPath(primaryRoot);
    this.options = options;
    this.ignoredNames = new Set([...(options.ignoredNames || []), ...DEFAULT_IGNORED_NAMES]);

    if (!this.allowedRoots.some((item) => normalizePathKey(item) === normalizePathKey(this.primaryRoot))) {
      this.allowedRoots.unshift(this.primaryRoot);
    }
  }

  getWorkspaceRoot(): string {
    return this.primaryRoot;
  }

  getAllowedRoots(): string[] {
    return [...this.allowedRoots];
  }

  getDirectoryTree(targetPath = this.primaryRoot, depth = this.options.maxTreeDepth): FileManagerTreeNode {
    const safeDepth = Math.max(0, Math.min(depth, this.options.maxTreeDepth));
    const { targetPath: resolvedPath, stats, rootPath } = this.resolveTarget(targetPath, 'directory');
    return this.buildTree(resolvedPath, stats, rootPath, safeDepth);
  }

  readFile(targetPath: string): FileManagerFilePreview {
    const { targetPath: resolvedPath, stats, rootPath } = this.resolveTarget(targetPath, 'file');
    const fileSize = stats.size;
    const bytesToRead = Math.max(0, Math.min(fileSize, this.options.maxFileReadBytes));
    const buffer = Buffer.alloc(bytesToRead);

    let bytesRead = 0;
    const fd = fs.openSync(resolvedPath, 'r');
    try {
      if (bytesToRead > 0) {
        bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, 0);
      }
    } finally {
      fs.closeSync(fd);
    }

    const previewBuffer = buffer.subarray(0, bytesRead);
    const binary = this.looksBinary(previewBuffer);
    const truncated = fileSize > bytesRead;
    const relativePath = this.toRelativePath(rootPath, resolvedPath);

    if (binary) {
      return {
        path: resolvedPath,
        relativePath,
        content: '[二进制文件，暂不支持在线预览]',
        size: fileSize,
        modifiedAt: stats.mtime.toISOString(),
        truncated,
        binary: true,
        encoding: 'binary',
      };
    }

    let content = previewBuffer.toString('utf-8');
    if (truncated) {
      const kb = Math.max(1, Math.round(this.options.maxFileReadBytes / 1024));
      content = `${content}\n\n[已截断，仅显示前 ${kb} KB]`;
    }

    return {
      path: resolvedPath,
      relativePath,
      content,
      size: fileSize,
      modifiedAt: stats.mtime.toISOString(),
      truncated,
      binary: false,
      encoding: 'utf-8',
    };
  }

  private buildTree(
    targetPath: string,
    stats: fs.Stats,
    rootPath: string,
    depth: number
  ): FileManagerTreeNode {
    const node = this.createNode(targetPath, stats, rootPath);

    if (!stats.isDirectory()) {
      return node;
    }

    const entries = this.readVisibleEntries(targetPath);
    node.hasChildren = entries.length > 0;

    if (depth <= 0) {
      node.loaded = false;
      return node;
    }

    const limitedEntries = entries.slice(0, this.options.maxEntriesPerDirectory);
    node.loaded = true;
    node.truncated = entries.length > limitedEntries.length;
    node.children = limitedEntries.map((entry) => {
      const childPath = path.join(targetPath, entry.name);
      const childStats = fs.statSync(childPath);
      return this.buildTree(childPath, childStats, rootPath, depth - 1);
    });

    return node;
  }

  private createNode(targetPath: string, stats: fs.Stats, rootPath: string): FileManagerTreeNode {
    return {
      name: path.basename(targetPath) || targetPath,
      path: targetPath,
      relativePath: this.toRelativePath(rootPath, targetPath),
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      hasChildren: stats.isDirectory() ? this.directoryHasVisibleChildren(targetPath) : false,
    };
  }

  private directoryHasVisibleChildren(targetPath: string): boolean {
    try {
      return this.readVisibleEntries(targetPath).length > 0;
    } catch {
      return false;
    }
  }

  private readVisibleEntries(targetPath: string): fs.Dirent[] {
    return fs
      .readdirSync(targetPath, { withFileTypes: true })
      .filter((entry) => this.isVisibleEntry(entry.name))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }
        return left.name.localeCompare(right.name, 'zh-CN');
      });
  }

  private isVisibleEntry(name: string): boolean {
    if (!name || name.startsWith('.')) {
      return false;
    }

    return !this.ignoredNames.has(name);
  }

  private resolveTarget(
    targetPath: string,
    expectedType: 'file' | 'directory'
  ): { targetPath: string; stats: fs.Stats; rootPath: string } {
    const resolvedPath = safeRealPath(targetPath);
    const matchedRoot = this.allowedRoots.find((item) => isInsideRoot(resolvedPath, item));

    if (!matchedRoot) {
      throw new Error('目标路径超出允许的工作区范围');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error('目标路径不存在');
    }

    const stats = fs.statSync(resolvedPath);
    if (expectedType === 'directory' && !stats.isDirectory()) {
      throw new Error('目标路径不是目录');
    }

    if (expectedType === 'file' && !stats.isFile()) {
      throw new Error('目标路径不是文件');
    }

    return {
      targetPath: resolvedPath,
      stats,
      rootPath: matchedRoot,
    };
  }

  private toRelativePath(rootPath: string, targetPath: string): string {
    const relativePath = path.relative(rootPath, targetPath).replace(/\\/g, '/');
    return relativePath || '.';
  }

  private looksBinary(buffer: Buffer): boolean {
    if (buffer.length === 0) {
      return false;
    }

    let suspicious = 0;
    for (const value of buffer) {
      if (value === 0) {
        return true;
      }

      if ((value >= 1 && value <= 6) || (value >= 14 && value <= 31)) {
        suspicious += 1;
      }
    }

    return suspicious / buffer.length > 0.1;
  }
}

