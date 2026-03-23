import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';

export type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: Date;
}

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private watchPaths: string[];

  constructor(watchPaths: string[]) {
    super();
    this.watchPaths = watchPaths;
  }

  // 启动监听
  start(): void {
    this.watcher = chokidar.watch(this.watchPaths, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: false
    });

    // 转发所有事件
    this.watcher
      .on('all', (eventType, path) => {
        this.emit('change', { 
          type: eventType as FileChangeType, 
          path, 
          timestamp: new Date() 
        });
      });
  }

  // 停止监听
  stop(): void {
    this.watcher?.close();
  }
}
