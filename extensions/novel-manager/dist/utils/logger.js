"use strict";
/**
 * 日志工具
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
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
exports.logger = new Logger();
function createLogger(prefix, level) {
    const log = new Logger();
    if (level)
        log.setLevel(level);
    log.prefix = prefix;
    return log;
}
//# sourceMappingURL=logger.js.map