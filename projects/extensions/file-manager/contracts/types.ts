export type FileNodeType = 'file' | 'directory';

export type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface FileManagerTreeNode {
  name: string;
  path: string;
  relativePath: string;
  type: FileNodeType;
  size: number;
  modifiedAt: string;
  hasChildren?: boolean;
  loaded?: boolean;
  truncated?: boolean;
  children?: FileManagerTreeNode[];
}

export interface FileManagerFilePreview {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  modifiedAt: string;
  truncated: boolean;
  binary: boolean;
  encoding: 'utf-8' | 'binary';
}

export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: string;
}

export interface WatchRule {
  id: string;
  name: string;
  enabled: boolean;
  match: {
    paths?: string[];
    extensions?: string[];
    eventTypes?: FileChangeType[];
  };
  action: {
    type: 'log' | 'command' | 'webhook';
    config?: Record<string, unknown>;
  };
}

export interface FileManagerConfig {
  workspaceRoot?: string;
  allowedRoots?: string[];
  watchPaths?: string[];
  rules?: WatchRule[];
  allowShellCommands?: boolean;
  maxTreeDepth?: number;
  maxEntriesPerDirectory?: number;
  maxFileReadBytes?: number;
}

export interface FileManagerRuntimeInfo {
  workspaceRoot: string;
  allowedRoots: string[];
  watchPaths: string[];
  watcherActive: boolean;
  watcherMode?: 'chokidar' | 'native' | 'disabled';
  ruleCount: number;
  allowShellCommands: boolean;
  maxTreeDepth: number;
  maxEntriesPerDirectory: number;
  maxFileReadBytes: number;
}
