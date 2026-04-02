import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import type { FileChangeEvent, FileChangeType } from '../contracts';

type ChokidarModule = typeof import('chokidar');
type ChokidarWatcher = import('chokidar').FSWatcher;
type NativeWatcher = fs.FSWatcher;
type WatcherMode = 'chokidar' | 'native' | 'disabled';

const IGNORE_PATTERN = /(^|[\/\\])(\..+|node_modules|dist)([\/\\]|$)/;

let chokidarModule: ChokidarModule | null = null;
let chokidarUnavailable = false;
let chokidarWarningShown = false;
let nativeFallbackShown = false;
let nativeUnavailableShown = false;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message.includes("Cannot find module 'readdirp'")) {
      return 'missing optional dependency: readdirp';
    }

    return error.message;
  }

  return String(error);
}

function getChokidar(): ChokidarModule | null {
  if (chokidarModule) {
    return chokidarModule;
  }

  if (chokidarUnavailable) {
    return null;
  }

  try {
    chokidarModule = require('chokidar') as ChokidarModule;
    return chokidarModule;
  } catch (error) {
    chokidarUnavailable = true;
    if (!chokidarWarningShown) {
      chokidarWarningShown = true;
      console.log(`[file-manager] chokidar unavailable; falling back to native fs.watch: ${getErrorMessage(error)}`);
    }
    return null;
  }
}

export class FileWatcher extends EventEmitter {
  private watcher: ChokidarWatcher | null = null;
  private nativeWatchers: NativeWatcher[] = [];
  private readonly watchPaths: string[];
  private watcherMode: WatcherMode = 'disabled';

  constructor(watchPaths: string[]) {
    super();
    this.watchPaths = watchPaths;
  }

  start(): void {
    if (this.watcher || this.nativeWatchers.length > 0 || this.watchPaths.length === 0) {
      return;
    }

    const chokidar = getChokidar();
    if (chokidar) {
      this.startWithChokidar(chokidar);
      return;
    }

    this.startWithNativeWatcher();
  }

  stop(): void {
    if (this.watcher) {
      const currentWatcher = this.watcher;
      this.watcher = null;
      this.watcherMode = 'disabled';
      void currentWatcher.close();
    }

    if (this.nativeWatchers.length > 0) {
      for (const nativeWatcher of this.nativeWatchers) {
        nativeWatcher.close();
      }

      this.nativeWatchers = [];
      this.watcherMode = 'disabled';
    }
  }

  isRunning(): boolean {
    return this.watcher !== null || this.nativeWatchers.length > 0;
  }

  getMode(): WatcherMode {
    return this.watcherMode;
  }

  private startWithChokidar(chokidar: ChokidarModule): void {
    this.watcher = chokidar.watch(this.watchPaths, {
      ignored: IGNORE_PATTERN,
      persistent: true,
      ignoreInitial: true,
    });
    this.watcherMode = 'chokidar';

    this.watcher.on('all', (eventType, changedPath) => {
      const event: FileChangeEvent = {
        type: eventType as FileChangeType,
        path: changedPath,
        timestamp: new Date().toISOString(),
      };
      this.emit('change', event);
    });
  }

  private startWithNativeWatcher(): void {
    const watchers: NativeWatcher[] = [];

    try {
      for (const watchPath of this.watchPaths) {
        const nativeWatcher = fs.watch(
          watchPath,
          {
            recursive: true,
            persistent: true,
          },
          (eventType, fileName) => {
            const changedPath = this.resolveNativeChangedPath(watchPath, fileName);
            if (this.shouldIgnore(changedPath)) {
              return;
            }

            const event: FileChangeEvent = {
              type: this.mapNativeEventType(eventType, changedPath),
              path: changedPath,
              timestamp: new Date().toISOString(),
            };
            this.emit('change', event);
          }
        );

        watchers.push(nativeWatcher);
      }

      this.nativeWatchers = watchers;
      this.watcherMode = 'native';

      if (!nativeFallbackShown) {
        nativeFallbackShown = true;
        console.log('[file-manager] native fs.watch fallback enabled because chokidar is unavailable.');
      }
    } catch (error) {
      for (const nativeWatcher of watchers) {
        nativeWatcher.close();
      }

      this.nativeWatchers = [];
      this.watcherMode = 'disabled';

      if (!nativeUnavailableShown) {
        nativeUnavailableShown = true;
        console.log(`[file-manager] watcher disabled; native fs.watch fallback could not start: ${getErrorMessage(error)}`);
      }
    }
  }

  private resolveNativeChangedPath(basePath: string, fileName: string | Buffer | null): string {
    if (typeof fileName === 'string' && fileName.length > 0) {
      return path.join(basePath, fileName);
    }

    if (Buffer.isBuffer(fileName) && fileName.length > 0) {
      return path.join(basePath, fileName.toString('utf8'));
    }

    return basePath;
  }

  private shouldIgnore(changedPath: string): boolean {
    return IGNORE_PATTERN.test(changedPath);
  }

  private mapNativeEventType(eventType: string, changedPath: string): FileChangeType {
    if (eventType === 'change') {
      return 'change';
    }

    try {
      const stat = fs.statSync(changedPath);
      return stat.isDirectory() ? 'addDir' : 'add';
    } catch {
      return path.extname(changedPath) ? 'unlink' : 'unlinkDir';
    }
  }
}
