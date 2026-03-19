/**
 * 小说管理模块 - OpenClaw 插件
 */

// 导出核心模块
export * from './core/config';
export * from './core/database';
export * from './core/ContentPipeline';
export * from './core/pipeline/StateService';
export * from './core/pipeline/TaskMonitor';
export * from './core/pipeline/PolishFeatureDetector';
export * from './core/pipeline/ContentValidator';
export * from './core/pipeline/PublishService';
export * from './core/pipeline/FanqiePublisher';
export * from './core/pipeline/FanqieScanner';
export * from './core/pipeline/AuditService';
export * from './core/pipeline/ChapterRepository';
export * from './services/novel-service';
export * from './services/ai-service';
export * from './services/fanqie-sync-service';
export * from './utils/helpers';
export * from './utils/logger';

// OpenClaw 插件定义
const plugin = {
  id: "novel-manager",
  name: "小说数据管理",
  description: "小说数据管理Web界面",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  register(api: any) {
    // 注册静态文件服务
    api.registerStatic?.({
      path: '/novel',
      root: require('path').join(__dirname, 'public')
    });
  }
};

export default plugin;
export const register = plugin.register;
export const activate = () => {};
