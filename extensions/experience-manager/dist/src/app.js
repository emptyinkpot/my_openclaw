"use strict";
/**
 * Express 应用创建
 * 自包含：独立的 Express 实例
 */
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
exports.createApp = createApp;
exports.start = start;
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const experience_routes_1 = require("./routes/experience-routes");
function createApp(options = {}) {
    const port = options.port || parseInt(process.env.EXPERIENCE_PORT || '3002');
    const host = options.host || process.env.EXPERIENCE_HOST || '0.0.0.0';
    const publicPath = options.publicPath || path.join(__dirname, '../public');
    const app = (0, express_1.default)();
    // 中间件
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // CORS
    app.use((_req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });
    // API 路由 - 支持传入自定义 repository
    const router = (0, experience_routes_1.createExperienceRouter)(options.repository);
    app.use('/api/experience', router);
    // 静态文件
    app.use('/static', express_1.default.static(publicPath));
    // 主页面
    app.get('/', (_req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });
    // 健康检查
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            module: 'experience-manager',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        });
    });
    // 错误处理
    app.use((err, _req, res, _next) => {
        console.error('Server error:', err);
        res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        });
    });
    return { app, port, host };
}
async function start(options = {}) {
    const { app, port, host } = createApp(options);
    return new Promise((resolve, reject) => {
        const server = app.listen(port, host, () => {
            console.log(`[Experience] 服务已启动: http://${host}:${port}`);
            resolve();
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`端口 ${port} 已被占用`));
            }
            else {
                reject(err);
            }
        });
    });
}
//# sourceMappingURL=app.js.map