import { exec } from 'child_process';
import type { FileChangeEvent, WatchRule } from '../contracts';

export interface RulesEngineOptions {
  allowShellCommands: boolean;
  commandCwd: string;
}

export class RulesEngine {
  private readonly rules: WatchRule[];
  private readonly options: RulesEngineOptions;

  constructor(rules: WatchRule[], options: RulesEngineOptions) {
    this.rules = rules.filter((item) => item.enabled);
    this.options = options;
  }

  getActiveRuleCount(): number {
    return this.rules.length;
  }

  processEvent(event: FileChangeEvent): void {
    for (const rule of this.rules) {
      if (this.matches(event, rule)) {
        this.execute(event, rule);
      }
    }
  }

  private matches(event: FileChangeEvent, rule: WatchRule): boolean {
    if (rule.match.eventTypes && !rule.match.eventTypes.includes(event.type)) {
      return false;
    }

    if (rule.match.paths && !rule.match.paths.some((item) => event.path.includes(item))) {
      return false;
    }

    if (rule.match.extensions && rule.match.extensions.length > 0) {
      const extension = event.path.split('.').pop()?.toLowerCase();
      if (!extension || !rule.match.extensions.map((item) => item.toLowerCase()).includes(extension)) {
        return false;
      }
    }

    return true;
  }

  private execute(event: FileChangeEvent, rule: WatchRule): void {
    console.log(`[file-manager] 规则命中: ${rule.name}`, event);

    switch (rule.action.type) {
      case 'log':
        console.log('[file-manager] 事件日志:', event);
        return;

      case 'command':
        this.executeCommand(rule, event);
        return;

      case 'webhook':
        this.executeWebhook(rule, event);
        return;
    }
  }

  private executeCommand(rule: WatchRule, event: FileChangeEvent): void {
    const command = String(rule.action.config?.command || '').trim();
    if (!command) {
      return;
    }

    if (!this.options.allowShellCommands) {
      console.warn(`[file-manager] 已拦截规则命令执行: ${rule.name}`);
      return;
    }

    exec(command, { cwd: this.options.commandCwd, timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[file-manager] 规则命令执行失败:', error);
        return;
      }

      if (stdout) {
        console.log('[file-manager] 规则命令输出:', stdout.trim());
      }

      if (stderr) {
        console.warn('[file-manager] 规则命令警告:', stderr.trim());
      }

      console.log('[file-manager] 规则命令执行完成:', rule.name, event.path);
    });
  }

  private executeWebhook(rule: WatchRule, event: FileChangeEvent): void {
    const url = String(rule.action.config?.url || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      return;
    }

    void fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch((error) => {
      console.error('[file-manager] Webhook 调用失败:', error);
    });
  }
}
