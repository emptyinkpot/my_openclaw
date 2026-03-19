/**
 * Storage Protect Hook
 * 自动备份重要数据，防止误删除
 * 
 * @module hooks/storage-protect
 */

const { BaseHook, extractMessage } = require('../../lib');
const config = require('../../lib/config');
const fs = require('fs');
const path = require('path');

class StorageProtectHook extends BaseHook {
  constructor() {
    super({
      name: 'storage-protect',
      version: '2.1.0',
      description: '存储保护 - 自动备份和防误删',
      emoji: '🔒',
      events: ['tool:complete'],  // 使用 tool:complete
      priority: 5, // 高优先级
    });
    
    // 受保护的路径
    this.protectedPaths = [
      'accounts',
      'platforms/baimeng',
      'platforms/fanqie',
    ];
  }
  
  /**
   * 处理事件
   */
  async handle(event) {
    if (!this.isEnabled()) {
      return this.response(true, { skipped: true });
    }
    
    const context = event.context || {};
    const tool = context.toolName || context.tool || event.action;
    
    // 处理命令
    if (event.type === 'message') {
      return this.handleCommand(event);
    }
    
    // 拦截删除操作
    if (tool === 'delete_file' || tool === 'remove_file') {
      const targetPath = context.input?.path || context.input?.file_path || '';
      
      if (this.isProtectedPath(targetPath)) {
        this.logEvent({
          type: 'blocked',
          action: 'delete',
          path: targetPath,
        });
        
        return {
          blocked: true,
          message: `⚠️ 受保护路径不能直接删除: ${targetPath}\n请使用 /protect delete 命令进行安全删除。`,
        };
      }
    }
    
    // 拦截写入操作到受保护路径
    if (['write_file', 'edit_file'].includes(tool)) {
      const targetPath = context.input?.path || context.input?.file_path || '';
      
      if (this.isProtectedPath(targetPath)) {
        // 自动备份
        this.backupFile(targetPath);
      }
    }
    
    return this.response(true);
  }
  
  /**
   * 处理命令
   */
  async handleCommand(event) {
    const { content } = extractMessage(event);
    
    if (!content.startsWith('/protect')) {
      return this.response(true);
    }
    
    const args = content.split(/\s+/).slice(1);
    const action = args[0] || 'status';
    
    let result;
    switch (action) {
      case 'delete':
      case 'rm':
        result = await this.safeDelete(args[1]);
        break;
      case 'restore':
        result = this.restore(args[1]);
        break;
      case 'list':
      case 'trash':
        result = this.listTrash();
        break;
      case 'cleanup':
        result = this.cleanup();
        break;
      default:
        result = this.status();
    }
    
    return {
      reply: this.reply(`\`\`\`\n${result}\n\`\`\``),
    };
  }
  
  /**
   * 检查是否是受保护路径
   */
  isProtectedPath(targetPath) {
    const storageDir = config.ROOT.storage;
    const relPath = targetPath
      .replace(storageDir + '/', '')
      .replace(storageDir, '');
    
    for (const protectedPath of this.protectedPaths) {
      if (relPath === protectedPath || 
          relPath.startsWith(protectedPath + '/') ||
          protectedPath.startsWith(relPath + '/')) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 备份文件
   */
  backupFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const trashDir = path.join(config.ROOT.storage, '.trash');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(trashDir, `${path.basename(filePath)}.${timestamp}.bak`);
    
    this.ensureLogDir();
    fs.mkdirSync(trashDir, { recursive: true });
    fs.copyFileSync(filePath, backupPath);
    
    this.logEvent({ type: 'backup', from: filePath, to: backupPath });
  }
  
  /**
   * 安全删除
   */
  async safeDelete(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return '文件不存在';
    }
    
    this.backupFile(targetPath);
    
    // 移动到回收站而不是删除
    const trashDir = path.join(config.ROOT.storage, '.trash');
    const trashPath = path.join(trashDir, path.basename(targetPath));
    fs.renameSync(targetPath, trashPath);
    
    return `已移动到回收站: ${trashPath}`;
  }
  
  /**
   * 恢复文件
   */
  restore(filename) {
    const trashDir = path.join(config.ROOT.storage, '.trash');
    const trashPath = path.join(trashDir, filename);
    
    if (!fs.existsSync(trashPath)) {
      return '回收站中未找到该文件';
    }
    
    // 找到原始路径（从日志中）
    const logs = this.readLogs('events.jsonl');
    const backup = logs.find(l => l.to && l.to.includes(filename));
    
    if (backup?.from) {
      fs.renameSync(trashPath, backup.from);
      return `已恢复到: ${backup.from}`;
    }
    
    return `无法确定原始路径，请手动移动: ${trashPath}`;
  }
  
  /**
   * 列出回收站
   */
  listTrash() {
    const trashDir = path.join(config.ROOT.storage, '.trash');
    if (!fs.existsSync(trashDir)) {
      return '回收站为空';
    }
    
    const files = fs.readdirSync(trashDir);
    if (files.length === 0) {
      return '回收站为空';
    }
    
    return `回收站 (${files.length} 个文件):\n${files.map(f => `  ${f}`).join('\n')}`;
  }
  
  /**
   * 清理过期备份
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const trashDir = path.join(config.ROOT.storage, '.trash');
    if (!fs.existsSync(trashDir)) return '无需清理';
    
    const cutoffTime = Date.now() - maxAge;
    const files = fs.readdirSync(trashDir);
    let cleaned = 0;
    
    for (const file of files) {
      const filePath = path.join(trashDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }
    
    return `清理了 ${cleaned} 个过期文件`;
  }
  
  /**
   * 显示状态
   */
  status() {
    return `存储保护状态: 启用
受保护路径:
${this.protectedPaths.map(p => `  - ${p}`).join('\n')}
`;
  }
}


// 导出 - OpenClaw 兼容格式
const { createHookExport } = require('../../lib');
const hookInstance = new StorageProtectHook();
module.exports = createHookExport(hookInstance);
module.exports.StorageProtectHook = StorageProtectHook;
