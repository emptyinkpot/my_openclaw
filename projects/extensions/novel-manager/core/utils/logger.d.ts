/**
 * 日志工具
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private level;
    private prefix;
    setLevel(level: LogLevel): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
export declare const logger: Logger;
export declare function createLogger(prefix: string, level?: LogLevel): Logger;
export {};
