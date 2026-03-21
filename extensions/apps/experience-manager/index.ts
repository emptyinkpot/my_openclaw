/**
 * 经验积累模块 - OpenClaw 插件
 * 
 * 职责：
 * - 结构化记录问题解决经验
 * - 通过 MemorySync 同步到 memory-lancedb-pro
 * - 提供经验检索和统计分析
 */

import { IncomingMessage, ServerResponse } from 'http';
import { experienceRepo } from './src/core/ExperienceRepository';
import { syncExperienceToMemory } from './src/core/MemorySync';

// 插件信息
const PLUGIN_ID = 'experience-manager';
const PLUGIN_NAME = '经验积累系统';
const PLUGIN_VERSION = '1.0.0';

// JSON响应辅助函数
function jsonRes(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// 解析请求体
async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 解析 URL 查询参数
function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryStr = url.split('?')[1] || '';
  for (const pair of queryStr.split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

/**
 * 处理经验管理 API 请求
 */
async function handleExperienceApi(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  const path = url.split('?')[0];
  const query = parseQuery(url);

  console.log(`[experience-manager] API request: ${method} ${path}`);

  // CORS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  try {
    // GET /api/experience/stats - 获取统计
    if (path === '/api/experience/stats' && method === 'GET') {
      const rawStats = experienceRepo.getStats();
      // 转换为前端期望的格式
      const stats = {
        totalRecords: rawStats.totalRecords,
        totalXP: rawStats.totalXP,
        level: rawStats.level,
        levelTitle: rawStats.levelTitle,
        byType: rawStats.typeDistribution,
        byDifficulty: rawStats.difficultyDistribution,
        byTag: rawStats.tagDistribution,
        avgDifficulty: rawStats.totalRecords > 0 
          ? Object.entries(rawStats.difficultyDistribution)
              .reduce((sum, [d, count]) => sum + parseInt(d) * count, 0) / rawStats.totalRecords
          : 0,
        monthlyGrowth: rawStats.monthlyGrowth,
        recentRecords: rawStats.recentRecords,
      };
      jsonRes(res, { success: true, data: stats });
      return true;
    }

    // GET /api/experience/records - 获取所有记录
    if (path === '/api/experience/records' && method === 'GET') {
      const records = experienceRepo.getAll();
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // POST /api/experience/records - 创建记录
    if (path === '/api/experience/records' && method === 'POST') {
      const body = await parseBody(req);
      const record = experienceRepo.create(body);
      
      // 同步到 memory-lancedb-pro
      if (process.env.EXPERIENCE_MEMORY_SYNC !== 'false') {
        syncExperienceToMemory(record).catch(err => {
          console.error('[experience-manager] 同步到 memory-lancedb-pro 失败:', err);
        });
      }
      
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // GET /api/experience/search - 搜索记录
    if (path === '/api/experience/search' && method === 'GET') {
      const keyword = query.q || '';
      const records = keyword ? experienceRepo.search(keyword) : experienceRepo.getAll();
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // GET /api/experience/tag/:tag - 按标签获取
    const tagMatch = path.match(/^\/api\/experience\/tag\/(.+)$/);
    if (tagMatch && method === 'GET') {
      const tag = decodeURIComponent(tagMatch[1]);
      const records = experienceRepo.getByTag(tag);
      jsonRes(res, { success: true, data: records });
      return true;
    }

    // GET /api/experience/records/:id - 获取单条记录
    const recordMatch = path.match(/^\/api\/experience\/records\/([a-zA-Z0-9-]+)$/);
    if (recordMatch && method === 'GET') {
      const record = experienceRepo.getById(recordMatch[1]);
      if (!record) {
        jsonRes(res, { success: false, error: '记录不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // PUT /api/experience/records/:id - 更新记录
    if (recordMatch && method === 'PUT') {
      const body = await parseBody(req);
      const record = experienceRepo.update(recordMatch[1], body);
      if (!record) {
        jsonRes(res, { success: false, error: '记录不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true, data: record });
      return true;
    }

    // DELETE /api/experience/records/:id - 删除记录
    if (recordMatch && method === 'DELETE') {
      const success = experienceRepo.delete(recordMatch[1]);
      if (!success) {
        jsonRes(res, { success: false, error: '记录不存在' }, 404);
        return true;
      }
      jsonRes(res, { success: true });
      return true;
    }

    // 未匹配的路由
    jsonRes(res, { success: false, error: 'Not found' }, 404);
    return true;

  } catch (error: any) {
    console.error('[experience-manager] API 错误:', error);
    jsonRes(res, { success: false, error: error.message }, 500);
    return true;
  }
}

// 页面路由现在由 novel-manager 插件处理，experience-manager 只提供 API

/**
 * 初始化数据
 */
async function initializeData() {
  try {
    const stats = experienceRepo.getStats();
    console.log(`[experience-manager] 已加载 ${stats.totalRecords} 条经验记录`);
  } catch (error) {
    console.error('[experience-manager] 初始化数据失败:', error);
  }
}

/**
 * OpenClaw 插件定义
 */
const plugin = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: '自我学习与经验积累模块，记录问题解决经验',
  version: PLUGIN_VERSION,
  configSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {}
  },
  
  /**
   * 注册插件
   */
  register(api: any) {
    console.log(`[${PLUGIN_ID}] Plugin registered`);
    
    // 注册 API 路由
    if (api?.registerHttpRoute) {
      console.log(`[${PLUGIN_ID}] 注册 HTTP 路由...`);
      
      // API 路由 - 需要 Gateway 认证
      api.registerHttpRoute({
        path: '/api/experience',
        match: 'prefix',
        handler: handleExperienceApi,
        auth: 'gateway'
      });
      
      console.log(`[${PLUGIN_ID}] 路由注册完成`);
    }
  },
  
  /**
   * 激活插件
   */
  async activate() {
    console.log(`[${PLUGIN_ID}] Plugin activated`);
    await initializeData();
  }
};

export default plugin;
export const register = plugin.register;
export const activate = plugin.activate;

// 导出核心功能
export { experienceRepo, syncExperienceToMemory };
export { ExperienceRepository } from './src/core/ExperienceRepository';
