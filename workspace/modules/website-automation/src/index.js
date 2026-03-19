/**
 * @fileoverview 模块入口
 * @module @openclaw-modules/website-automation
 */

const WebsiteAutomation = require('./core/automation');
const { Logger } = require('./utils/logger');

module.exports = {
  WebsiteAutomation,
  Logger,
  
  // 版本信息
  version: require('../package.json').version
};
