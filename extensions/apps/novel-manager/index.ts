/**
 * 小说管理模块 - OpenClaw 插件 (简化版 - 仅 content-craft)
 */
import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';

// 导入配置管理器
import { configManager } from './core/content-craft/src/config-manager';
import { PolishPipeline } from './core/content-craft/src/pipeline';

// 尝试导入 registerPluginHttpRoute
let registerPluginHttpRoute: any;
try {
  // @ts-ignore
  registerPluginHttpRoute = require('@openclaw/plugin-sdk').registerPluginHttpRoute;
} catch (e) {
  console.log('[novel-manager] 无法加载 plugin-sdk，将使用备用方案');
}

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
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 解析URL参数
function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryString = url.split('?')[1] || '';
  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

// 路由处理器 - 处理 /api/novel/ API
async function handleNovelApi(req: IncomingMessage, res: ServerResponse): Promise<boolean | void> {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  const path = url.split('?')[0];
  const query = parseQuery(url);

  try {
    // CORS预检
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return true;
    }

    // ====== 配置管理API ======
    // 获取配置
    if (path === '/api/novel/config' && method === 'GET') {
      try {
        const settings = configManager.getSettings();
        const stepConfigs = configManager.getAllStepConfigs();
        jsonRes(res, { 
          success: true, 
          data: { 
            settings, 
            stepConfigs 
          } 
        });
      } catch (error) {
        console.error('[ConfigAPI] 获取配置失败:', error);
        jsonRes(res, { success: false, error: '获取配置失败' }, 500);
      }
      return true;
    }

    // 保存配置
    if (path === '/api/novel/config' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { settings } = body;
        if (settings) {
          configManager.saveSettings(settings);
        }
        jsonRes(res, { success: true, message: '配置保存成功' });
      } catch (error) {
        console.error('[ConfigAPI] 保存配置失败:', error);
        jsonRes(res, { success: false, error: '保存配置失败' }, 500);
      }
      return true;
    }

    // 更新单个步骤配置
    if (path === '/api/novel/config/step' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { stepId, settings } = body;
        if (stepId && settings) {
          configManager.updateStepSetting(stepId, settings);
        }
        jsonRes(res, { success: true, message: '步骤配置更新成功' });
      } catch (error) {
        console.error('[ConfigAPI] 更新步骤配置失败:', error);
        jsonRes(res, { success: false, error: '更新步骤配置失败' }, 500);
      }
      return true;
    }

    // 更新全局配置
    if (path === '/api/novel/config/global' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { global } = body;
        if (global) {
          configManager.updateGlobalSetting(global);
        }
        jsonRes(res, { success: true, message: '全局配置更新成功' });
      } catch (error) {
        console.error('[ConfigAPI] 更新全局配置失败:', error);
        jsonRes(res, { success: false, error: '更新全局配置失败' }, 500);
      }
      return true;
    }

    // 重置配置
    if (path === '/api/novel/config/reset' && method === 'POST') {
      try {
        configManager.resetToDefaults();
        jsonRes(res, { success: true, message: '配置已重置为默认值' });
      } catch (error) {
        console.error('[ConfigAPI] 重置配置失败:', error);
        jsonRes(res, { success: false, error: '重置配置失败' }, 500);
      }
      return true;
    }

    // ====== 文本润色API ======
    // 完整润色流程
    if (path === '/api/novel/content-craft/polish' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { text, settings } = body;
        
        if (!text?.trim()) {
          jsonRes(res, { success: false, error: '请提供要润色的文本' }, 400);
          return true;
        }

        const pipeline = new PolishPipeline();
        const defaultSettings = configManager.getSettings();
        const result = await pipeline.execute({ text, settings: settings || defaultSettings });
        
        jsonRes(res, { 
          success: true, 
          data: {
            originalText: text,
            polishedText: result.text,
            reports: result.reports,
            metadata: result.metadata,
            totalReplacements: result.replacements.length
          } 
        });
      } catch (error) {
        console.error('[ContentCraft] 润色失败:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '润色失败' }, 500);
      }
      return true;
    }

    // 仅禁用词替换
    if (path === '/api/novel/content-craft/banned-words' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { text } = body;
        
        if (!text?.trim()) {
          jsonRes(res, { success: false, error: '请提供要处理的文本' }, 400);
          return true;
        }

        // 临时：模拟禁用词替换
        const mockBannedWords = [
          { word: '禁用词1', replacement: '替换词1' },
          { word: '禁用词2', replacement: '替换词2' }
        ];
        
        let processedText = text;
        const replacements: any[] = [];
        
        mockBannedWords.forEach(({ word, replacement }) => {
          if (processedText.includes(word)) {
            processedText = processedText.split(word).join(replacement);
            replacements.push({ original: word, replaced: replacement });
          }
        });
        
        jsonRes(res, { 
          success: true, 
          data: { 
            text: processedText, 
            replacements,
            source: '模拟禁用词库'
          } 
        });
      } catch (error) {
        console.error('[BannedWords] 处理失败:', error);
        jsonRes(res, { success: false, error: error instanceof Error ? error.message : '处理失败' }, 500);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('[NovelAPI] 错误:', error);
    jsonRes(res, { success: false, error: '服务器内部错误' }, 500);
    return true;
  }
}

// 插件主函数
export function activate() {
  console.log('[novel-manager] 插件已激活 (content-craft 版本)');
  
  // 注册 HTTP 路由
  if (registerPluginHttpRoute) {
    registerPluginHttpRoute('/api/novel/*', handleNovelApi);
    console.log('[novel-manager] HTTP 路由已注册');
  } else {
    console.log('[novel-manager] 无法注册 HTTP 路由，plugin-sdk 不可用');
  }
}

// 导出内容润色模块的主要类和函数
export { configManager, PolishPipeline };

// 默认导出
export default { activate };
