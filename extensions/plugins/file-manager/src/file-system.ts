import * as fs from 'fs';
import * as path from 'path';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: Date;
}

export class FileSystem {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  // 递归获取目录树
  async getDirectoryTree(dirPath?: string): Promise<FileNode> {
    const targetPath = dirPath || this.rootPath;
    const stats = fs.statSync(targetPath);
    
    const node: FileNode = {
      name: path.basename(targetPath),
      path: targetPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modifiedAt: stats.mtime
    };

    if (stats.isDirectory()) {
      node.children = [];
      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // 忽略隐藏文件
        if (entry.name === 'node_modules') continue; // 忽略 node_modules
        const childPath = path.join(targetPath, entry.name);
        node.children.push(await this.getDirectoryTree(childPath));
      }
    }

    return node;
  }

  // 读取文件内容
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // 写入文件内容
  writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
