/**
 * @fileoverview 日志工具
 * @module @openclaw-modules/website-automation/utils/logger
 */

const fs = require('fs');
const path = require('path');

/**
 * 简单日志记录器
 */
class Logger {
  /**
   * @param {Object} options
   * @param {string} [options.level='info'] - 日志级别
   * @param {string} [options.logDir] - 日志目录
   * @param {boolean} [options.console=true] - 是否输出到控制台
   */
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.logDir = options.logDir;
    this.console = options.console !== false;
    
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    
    if (this.logDir && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _log(level, message, meta = {}) {
    if (this.levels[level] > this.levels[this.level]) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };
    
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (this.console) {
      console.log(logLine);
    }
    
    if (this.logDir) {
      const logFile = path.join(this.logDir, `${new Date().toISOString().slice(0, 10)}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }
    
    return logEntry;
  }

  error(message, meta) { return this._log('error', message, meta); }
  warn(message, meta) { return this._log('warn', message, meta); }
  info(message, meta) { return this._log('info', message, meta); }
  debug(message, meta) { return this._log('debug', message, meta); }
}

module.exports = { Logger };
