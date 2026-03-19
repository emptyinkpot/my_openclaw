"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.register = void 0;
const novel_service_1 = require("./services/novel-service");
// 尝试导入 registerPluginHttpRoute
let registerPluginHttpRoute;
try {
    // @ts-ignore
    registerPluginHttpRoute = require('@openclaw/plugin-sdk').registerPluginHttpRoute;
}
catch (e) {
    console.log('[novel-manager] 无法加载 plugin-sdk，将使用备用方案');
}
// 服务实例
let novelService = null;
function getNovelService() {
    if (!novelService) {
        novelService = new novel_service_1.NovelService();
    }
    return novelService;
}
// JSON响应辅助函数
function jsonRes(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}
// 解析请求体
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}
// 解析URL参数
function parseQuery(url) {
    const query = {};
    const queryString = url.split('?')[1] || '';
    for (const pair of queryString.split('&')) {
        const [key, value] = pair.split('=');
        if (key)
            query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
    return query;
}
// 路由处理器
async function handleNovelApi(req, res) {
    const url = req.url || '';
    const method = req.method || 'GET';
    // 只处理 /api/novel 路由
    if (!url.startsWith('/api/novel')) {
        return false;
    }
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
        // 统计数据
        if (path === '/api/novel/stats' && method === 'GET') {
            const stats = await getNovelService().getStats();
            jsonRes(res, { success: true, data: stats });
            return true;
        }
        // 作品列表
        if (path === '/api/novel/works' && method === 'GET') {
            const filter = {
                status: query.status,
                platform: query.platform,
                search: query.search,
            };
            const works = await getNovelService().getWorks(filter);
            jsonRes(res, { success: true, data: works });
            return true;
        }
        // 作品详情
        const workDetailMatch = path.match(/^\/api\/novel\/works\/(\d+)$/);
        if (workDetailMatch && method === 'GET') {
            const id = parseInt(workDetailMatch[1]);
            const work = await getNovelService().getWorkById(id);
            if (!work) {
                jsonRes(res, { success: false, error: '作品不存在' }, 404);
                return true;
            }
            jsonRes(res, { success: true, data: work });
            return true;
        }
        // 删除作品
        if (workDetailMatch && method === 'DELETE') {
            const id = parseInt(workDetailMatch[1]);
            await getNovelService().deleteWork(id);
            jsonRes(res, { success: true });
            return true;
        }
        // 章节详情
        const chapterMatch = path.match(/^\/api\/novel\/chapters\/(\d+)$/);
        if (chapterMatch && method === 'GET') {
            const id = parseInt(chapterMatch[1]);
            const chapter = await getNovelService().getChapterById(id);
            jsonRes(res, { success: true, data: chapter });
            return true;
        }
        // 更新章节
        if (chapterMatch && method === 'PUT') {
            const id = parseInt(chapterMatch[1]);
            const body = await parseBody(req);
            await getNovelService().updateChapter(id, body);
            jsonRes(res, { success: true });
            return true;
        }
        // 章节列表（按作品ID）
        const chaptersByWorkMatch = path.match(/^\/api\/novel\/works\/(\d+)\/chapters$/);
        if (chaptersByWorkMatch && method === 'GET') {
            const workId = parseInt(chaptersByWorkMatch[1]);
            const chapters = await getNovelService().getChaptersByWorkId(workId);
            jsonRes(res, { success: true, data: chapters });
            return true;
        }
        // 角色列表
        const charactersByWorkMatch = path.match(/^\/api\/novel\/works\/(\d+)\/characters$/);
        if (charactersByWorkMatch && method === 'GET') {
            const workId = parseInt(charactersByWorkMatch[1]);
            const characters = await getNovelService().getCharactersByWorkId(workId);
            jsonRes(res, { success: true, data: characters });
            return true;
        }
        // 根据卷纲生成章节
        const generateChaptersMatch = path.match(/^\/api\/novel\/works\/(\d+)\/generate-chapters-from-volumes$/);
        if (generateChaptersMatch && method === 'POST') {
            const id = parseInt(generateChaptersMatch[1]);
            const result = await getNovelService().generateChaptersFromVolumes(id);
            jsonRes(res, { success: true, ...result });
            return true;
        }
        // 番茄作品列表
        if (path === '/api/novel/fanqie/works' && method === 'GET') {
            const works = await getNovelService().getFanqieWorks();
            jsonRes(res, { success: true, data: works });
            return true;
        }
        // 番茄发布
        if (path === '/api/novel/fanqie/publish' && method === 'POST') {
            const body = await parseBody(req);
            const result = await getNovelService().startFanqiePublish(body);
            jsonRes(res, { success: true, message: result.message, note: result.note });
            return true;
        }
        // 经验记录列表
        if (path === '/api/novel/experience/records' && method === 'GET') {
            const records = await getNovelService().getExperienceRecords();
            jsonRes(res, { success: true, data: records });
            return true;
        }
        // 添加经验记录
        if (path === '/api/novel/experience/records' && method === 'POST') {
            const body = await parseBody(req);
            const record = await getNovelService().addExperienceRecord(body);
            jsonRes(res, { success: true, data: record });
            return true;
        }
        // 缓存文件列表
        if (path === '/api/novel/cache/files' && method === 'GET') {
            const files = await getNovelService().getCacheFiles();
            jsonRes(res, { success: true, data: files });
            return true;
        }
        // 获取缓存文件内容
        const cacheFileMatch = path.match(/^\/api\/novel\/cache\/files\/([^/]+)$/);
        if (cacheFileMatch && method === 'GET') {
            const content = await getNovelService().getCacheFileContent(cacheFileMatch[1]);
            jsonRes(res, { success: true, data: content });
            return true;
        }
        // 保存缓存文件
        if (cacheFileMatch && method === 'PUT') {
            const body = await parseBody(req);
            await getNovelService().saveCacheFileContent(cacheFileMatch[1], body.content);
            jsonRes(res, { success: true });
            return true;
        }
        // 404
        jsonRes(res, { success: false, error: 'API路由不存在' }, 404);
        return true;
    }
    catch (err) {
        console.error('[novel-manager] API错误:', err);
        jsonRes(res, { success: false, error: err.message || '服务器错误' }, 500);
        return true;
    }
}
// OpenClaw 插件定义
const plugin = {
    id: "novel-manager",
    name: "小说数据管理",
    description: "小说数据管理Web界面",
    version: "1.0.0",
    configSchema: {
        type: "object",
        additionalProperties: false,
        properties: {}
    },
    register(api) {
        console.log('[novel-manager] Plugin registered, api:', typeof api, Object.keys(api || {}));
        // 尝试通过api注册
        if (api?.registerHttpRoute) {
            console.log('[novel-manager] 使用 api.registerHttpRoute');
            api.registerHttpRoute({
                path: '/api/novel',
                match: 'prefix',
                handler: handleNovelApi,
                auth: 'none'
            });
        }
        // 尝试直接使用 registerPluginHttpRoute
        else if (registerPluginHttpRoute) {
            console.log('[novel-manager] 使用 registerPluginHttpRoute');
            registerPluginHttpRoute({
                path: '/api/novel',
                match: 'prefix',
                handler: handleNovelApi,
                auth: 'none',
                pluginId: 'novel-manager'
            });
        }
        // 备用：直接注册到全局
        else {
            console.log('[novel-manager] 使用全局注册');
            // @ts-ignore
            if (globalThis.__openclawHttpRoutes) {
                // @ts-ignore
                globalThis.__openclawHttpRoutes.push({
                    path: '/api/novel',
                    match: 'prefix',
                    handler: handleNovelApi,
                    auth: 'none'
                });
            }
        }
        console.log('[novel-manager] API路由注册完成');
    },
    activate() {
        console.log('[novel-manager] Plugin activated');
    }
};
exports.default = plugin;
exports.register = plugin.register;
exports.activate = plugin.activate;
//# sourceMappingURL=index.js.map