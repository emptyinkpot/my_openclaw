/**
 * 日志工具
 */
class Logger {
    constructor() {
        this.level = 'info';
        this.prefix = '[NovelManager]';
    }
    setLevel(level) {
        this.level = level;
    }
    debug(message, ...args) {
        if (this.level === 'debug') {
            console.debug(this.prefix, message, ...args);
        }
    }
    info(message, ...args) {
        if (['debug', 'info'].includes(this.level)) {
            console.log(this.prefix, message, ...args);
        }
    }
    warn(message, ...args) {
        if (['debug', 'info', 'warn'].includes(this.level)) {
            console.warn(this.prefix, message, ...args);
        }
    }
    error(message, ...args) {
        console.error(this.prefix, message, ...args);
    }
}
export const logger = new Logger();
export function createLogger(prefix, level) {
    const log = new Logger();
    if (level)
        log.setLevel(level);
    log.prefix = prefix;
    return log;
}
