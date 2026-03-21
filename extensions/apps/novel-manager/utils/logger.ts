/**
 * 日志工具
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel = 'info';
  private prefix = '[NovelManager]';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level === 'debug') {
      console.debug(this.prefix, message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (['debug', 'info'].includes(this.level)) {
      console.log(this.prefix, message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      console.warn(this.prefix, message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    console.error(this.prefix, message, ...args);
  }
}

export const logger = new Logger();

export function createLogger(prefix: string, level?: LogLevel): Logger {
  const log = new Logger();
  if (level) log.setLevel(level);
  (log as any).prefix = prefix;
  return log;
}
