/**
 * 经验积累模块 - OpenClaw 插件
 */

// 导出核心模块
export * from './core/ExperienceRepository';

// OpenClaw 插件定义
const plugin = {
  id: "experience-manager",
  name: "经验积累系统",
  description: "自我学习与经验积累模块",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  register(api: any) {
    // 注册静态文件服务
    api.registerStatic?.({
      path: '/experience',
      root: require('path').join(__dirname, 'public')
    });
  }
};

export default plugin;
export const register = plugin.register;
export const activate = () => {};
