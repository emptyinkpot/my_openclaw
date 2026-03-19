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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 小说管理 API 服务
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const novel_service_1 = require("./services/novel-service");
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.NOVEL_API_PORT || '3001', 10);
const API_PREFIX = '/novel/api';
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 服务实例
let novelService = null;
function getNovelService() {
    if (!novelService) {
        novelService = new novel_service_1.NovelService();
    }
    return novelService;
}
// 统计数据
app.get(`${API_PREFIX}/stats`, async (req, res) => {
    try {
        const stats = await getNovelService().getStats();
        res.json({ success: true, data: stats });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 作品列表
app.get(`${API_PREFIX}/works`, async (req, res) => {
    try {
        const filter = {
            status: req.query.status,
            platform: req.query.platform,
            search: req.query.search,
        };
        const works = await getNovelService().getWorks(filter);
        res.json({ success: true, data: works });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 作品详情
app.get(`${API_PREFIX}/works/:id`, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const work = await getNovelService().getWorkById(id);
        if (!work) {
            return res.status(404).json({ success: false, error: '作品不存在' });
        }
        res.json({ success: true, data: work });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 删除作品
app.delete(`${API_PREFIX}/works/:id`, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await getNovelService().deleteWork(id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 更新章节
app.put(`${API_PREFIX}/chapters/:id`, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = req.body;
        await getNovelService().updateChapter(id, data);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 根据卷纲生成章节
app.post(`${API_PREFIX}/works/:id/generate-chapters-from-volumes`, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await getNovelService().generateChaptersFromVolumes(id);
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 番茄作品列表
app.get(`${API_PREFIX}/fanqie/works`, async (req, res) => {
    try {
        const works = await getNovelService().getFanqieWorks();
        res.json({ success: true, data: works });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 番茄发布
app.post(`${API_PREFIX}/fanqie/publish`, async (req, res) => {
    try {
        const result = await getNovelService().startFanqiePublish(req.body);
        res.json({ success: true, message: result.message, note: result.note });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 经验记录列表
app.get(`${API_PREFIX}/experience/records`, async (req, res) => {
    try {
        const records = await getNovelService().getExperienceRecords();
        res.json({ success: true, data: records });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 添加经验记录
app.post(`${API_PREFIX}/experience/records`, async (req, res) => {
    try {
        const record = await getNovelService().addExperienceRecord(req.body);
        res.json({ success: true, data: record });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 缓存文件列表
app.get(`${API_PREFIX}/cache/files`, async (req, res) => {
    try {
        const files = await getNovelService().getCacheFiles();
        res.json({ success: true, data: files });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 获取缓存文件内容
app.get(`${API_PREFIX}/cache/files/:name`, async (req, res) => {
    try {
        const content = await getNovelService().getCacheFileContent(req.params.name);
        res.json({ success: true, data: content });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 保存缓存文件
app.put(`${API_PREFIX}/cache/files/:name`, async (req, res) => {
    try {
        await getNovelService().saveCacheFileContent(req.params.name, req.body.content);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 静态文件服务（开发模式）
if (process.env.NODE_ENV !== 'production') {
    app.use('/novel', express_1.default.static(path.join(__dirname, 'public')));
}
// 启动服务
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`小说管理 API 服务已启动: http://0.0.0.0:${PORT}${API_PREFIX}`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map