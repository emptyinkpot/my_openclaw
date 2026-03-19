/**
 * OpenClaw Workspace - 共享库入口
 * 
 * 统一导出所有共享模块
 * 
 * @module lib
 */

const config = require('./config');
const utils = require('./utils');
const { BaseController, createCliEntry } = require('./base-controller');
const { BaseHook, createHookExport, createHookFromClass, extractMessage, detectMessageType, extractToolCall } = require('./base-hook');

module.exports = {
  // 配置
  config,
  
  // 工具函数
  ...utils,
  
  // 控制器
  BaseController,
  createCliEntry,
  
  // Hook
  BaseHook,
  createHookExport,
  createHookFromClass,
  extractMessage,
  detectMessageType,
  extractToolCall,
};
