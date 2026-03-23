import { FileChangeType, FileChangeEvent } from './file-watcher';
import { exec } from 'child_process';

export interface WatchRule {
  id: string;
  name: string;
  enabled: boolean;
  match: {
    paths?: string[];        // 路径包含匹配
    extensions?: string[];   // 文件扩展名匹配
    eventTypes?: FileChangeType[]; // 事件类型匹配
  };
  action: {
    type: 'log' | 'command' | 'webhook';
    config?: any;
  };
}

export class RulesEngine {
  private rules: WatchRule[];

  constructor(rules: WatchRule[]) {
    this.rules = rules.filter(r => r.enabled);
  }

  // 处理变化事件
  processEvent(event: FileChangeEvent): void {
    for (const rule of this.rules) {
      if (this.matches(event, rule)) {
        this.execute(event, rule);
      }
    }
  }

  // 检查是否匹配规则
  private matches(event: FileChangeEvent, rule: WatchRule): boolean {
    // 检查事件类型
    if (rule.match.eventTypes && !rule.match.eventTypes.includes(event.type)) {
      return false;
    }

    // 检查路径包含
    if (rule.match.paths && !rule.match.paths.some(p => event.path.includes(p))) {
      return false;
    }

    // 检查扩展名
    if (rule.match.extensions) {
      const ext = event.path.split('.').pop()?.toLowerCase();
      if (!ext || !rule.match.extensions.includes(ext)) {
        return false;
      }
    }

    return true;
  }

  // 执行规则动作
  private execute(event: FileChangeEvent, rule: WatchRule): void {
    console.log(`[FileManager] 规则 "${rule.name}" 触发: ${event.type} ${event.path}`);
    
    switch (rule.action.type) {
      case 'log':
        console.log(`[FileManager] 日志:`, event);
        break;
      case 'command':
        // 执行 shell 命令
        if (rule.action.config?.command) {
          exec(rule.action.config.command, (error, stdout, stderr) => {
            if (error) {
              console.error(`[FileManager] 命令执行错误:`, error);
            }
            if (stdout) {
              console.log(`[FileManager] 命令输出:`, stdout);
            }
          });
        }
        break;
      case 'webhook':
        // 调用 webhook
        if (rule.action.config?.url) {
          fetch(rule.action.config.url, {
            method: 'POST',
            body: JSON.stringify(event),
            headers: {
              'Content-Type': 'application/json'
            }
          }).catch(err => {
            console.error(`[FileManager] Webhook 调用失败:`, err);
          });
        }
        break;
    }
  }
}
