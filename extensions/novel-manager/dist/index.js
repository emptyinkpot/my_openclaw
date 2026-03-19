"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.register = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
let htmlCache = null;
function getNovelService() {
    if (!novelService) {
        novelService = new novel_service_1.NovelService();
    }
    return novelService;
}
// 获取小说管理界面HTML
function getNovelHtml() {
    if (htmlCache)
        return htmlCache;
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    try {
        htmlCache = fs.readFileSync(htmlPath, 'utf-8');
        return htmlCache;
    }
    catch (e) {
        console.error('[novel-manager] 无法读取HTML文件:', htmlPath);
        return '<html><body><h1>小说管理界面加载失败</h1></body></html>';
    }
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
// 获取页面HTML
function getPageHtml(pageName) {
    // 原生界面使用control-ui目录
    if (pageName === 'native.html') {
        const nativePath = '/usr/lib/node_modules/openclaw/dist/control-ui/index.html';
        try {
            return fs.readFileSync(nativePath, 'utf-8');
        }
        catch (e) {
            console.error('[novel-manager] 无法读取原生界面:', nativePath);
            return '<html><body><h1>原生界面加载失败</h1></body></html>';
        }
    }
    const htmlPath = path.join(__dirname, 'public', pageName);
    try {
        return fs.readFileSync(htmlPath, 'utf-8');
    }
    catch (e) {
        console.error('[novel-manager] 无法读取HTML文件:', htmlPath);
        return '<html><body><h1>页面加载失败</h1></body></html>';
    }
}
// 路由处理器 - 处理页面请求（不需要认证）
async function handleNovelPage(req, res) {
    const url = req.url || '';
    const urlPath = url.split('?')[0];
    // 页面路由映射
    const pageMap = {
        '/': 'native.html',
        '/novel': 'index.html',
        '/novel/': 'index.html',
        '/auto.html': 'auto.html',
        '/experience.html': 'experience.html',
        '/cache.html': 'cache.html'
    };
    const pageFile = pageMap[urlPath];
    if (pageFile) {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
        });
        res.end(getPageHtml(pageFile));
        return true;
    }
    return false;
}
// 路由处理器 - 处理 /api/novel/ API（需要认证）
async function handleNovelApi(req, res) {
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
        // 页面路由配置
        const pageRoutes = [
            { path: '/', match: 'exact' },
            { path: '/novel', match: 'exact' },
            { path: '/auto.html', match: 'exact' },
            { path: '/experience.html', match: 'exact' },
            { path: '/cache.html', match: 'exact' }
        ];
        // 注册页面路由 - 不需要认证
        if (api?.registerHttpRoute) {
            console.log('[novel-manager] 使用 api.registerHttpRoute');
            pageRoutes.forEach(route => {
                api.registerHttpRoute({
                    path: route.path,
                    match: route.match,
                    handler: handleNovelPage,
                    auth: 'plugin'
                });
            });
            // 注册API路由 - 需要认证
            api.registerHttpRoute({
                path: '/api/novel',
                match: 'prefix',
                handler: handleNovelApi,
                auth: 'gateway'
            });
        }
        // 尝试直接使用 registerPluginHttpRoute
        else if (registerPluginHttpRoute) {
            console.log('[novel-manager] 使用 registerPluginHttpRoute');
            pageRoutes.forEach(route => {
                registerPluginHttpRoute({
                    path: route.path,
                    match: route.match,
                    handler: handleNovelPage,
                    auth: 'plugin',
                    pluginId: 'novel-manager'
                });
            });
            registerPluginHttpRoute({
                path: '/api/novel',
                match: 'prefix',
                handler: handleNovelApi,
                auth: 'gateway',
                pluginId: 'novel-manager'
            });
        }
        // 备用：直接注册到全局
        else {
            console.log('[novel-manager] 使用全局注册');
            // @ts-ignore
            if (globalThis.__openclawHttpRoutes) {
                pageRoutes.forEach(route => {
                    // @ts-ignore
                    globalThis.__openclawHttpRoutes.push({
                        path: route.path,
                        match: route.match,
                        handler: handleNovelPage,
                        auth: 'plugin'
                    });
                });
                // @ts-ignore
                globalThis.__openclawHttpRoutes.push({
                    path: '/api/novel',
                    match: 'prefix',
                    handler: handleNovelApi,
                    auth: 'gateway'
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