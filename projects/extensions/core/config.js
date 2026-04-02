"use strict";
/**
 * 模块配置管理
 * 自包含配置系统，支持环境变量覆盖
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.loadConfig = loadConfig;
exports.reloadConfig = reloadConfig;
exports.saveConfig = saveConfig;
exports.getConfig = getConfig;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const LEGACY_WORKSPACE_PREFIX = '/workspace/projects';
const LEGACY_RUNTIME_PREFIX = '/tmp/openclaw';
function splitPathSegments(targetPath) {
    return targetPath.split(/[\\/]+/).filter(Boolean);
}
function resolveWorkspaceRoot() {
    const envRoot = process.env.NOVEL_MANAGER_WORKSPACE_ROOT ||
        process.env.OPENCLAW_WORKSPACE_ROOT ||
        process.env.OPENCLAW_PROJECT_ROOT;
    if (envRoot && envRoot.trim()) {
        return path.resolve(envRoot.trim());
    }
    let currentDir = __dirname;
    while (true) {
        if (fs.existsSync(path.join(currentDir, 'openclaw.json'))) {
            return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }
    return path.resolve(__dirname, '..', '..');
}
const workspaceRoot = resolveWorkspaceRoot();
const runtimeRoot = path.resolve(process.env.NOVEL_MANAGER_RUNTIME_ROOT ||
    process.env.OPENCLAW_RUNTIME_ROOT ||
    path.join(workspaceRoot, '.runtime'));
function resolveNovelManagerModuleRoot() {
    const envRoot = process.env.NOVEL_MANAGER_ROOT;
    if (envRoot && envRoot.trim()) {
        return path.resolve(envRoot.trim());
    }
    const moduleRoot = path.join(workspaceRoot, 'extensions', 'novel-manager');
    if (fs.existsSync(moduleRoot)) {
        return moduleRoot;
    }
    return path.resolve(__dirname);
}
function resolveWorkspacePath(...segments) {
    return path.join(workspaceRoot, ...segments);
}
function resolveRuntimePath(...segments) {
    return path.join(runtimeRoot, ...segments);
}
function normalizeLegacyPath(targetPath, fallbackBase = 'workspace') {
    if (!targetPath) {
        return targetPath;
    }
    if (targetPath.startsWith(LEGACY_WORKSPACE_PREFIX)) {
        const relativePath = targetPath.slice(LEGACY_WORKSPACE_PREFIX.length).replace(/^[/\\]+/, '');
        return resolveWorkspacePath(...splitPathSegments(relativePath));
    }
    if (targetPath.startsWith(LEGACY_RUNTIME_PREFIX)) {
        const relativePath = targetPath.slice(LEGACY_RUNTIME_PREFIX.length).replace(/^[/\\]+/, '');
        return resolveRuntimePath(...splitPathSegments(relativePath));
    }
    if (path.isAbsolute(targetPath)) {
        return path.normalize(targetPath);
    }
    return fallbackBase === 'runtime'
        ? resolveRuntimePath(...splitPathSegments(targetPath))
        : resolveWorkspacePath(...splitPathSegments(targetPath));
}
function normalizeConfigPaths(config) {
    return {
        ...config,
        database: {
            ...config.database,
            sqlitePath: config.database.sqlitePath
                ? normalizeLegacyPath(config.database.sqlitePath, 'workspace')
                : config.database.sqlitePath,
        },
        scheduler: {
            ...config.scheduler,
            stateFile: normalizeLegacyPath(config.scheduler.stateFile, 'runtime'),
            fanqieAccounts: (config.scheduler.fanqieAccounts || []).map(account => ({
                ...account,
                browserDir: normalizeLegacyPath(account.browserDir, 'runtime'),
                cookiesFile: normalizeLegacyPath(account.cookiesFile, 'workspace'),
            })),
        },
        log: {
            ...config.log,
            file: normalizeLegacyPath(config.log.file, 'runtime'),
        },
    };
}
// 默认配置
const defaultConfig = {
    port: parseInt(process.env.NOVEL_MANAGER_PORT || '3001'),
    host: process.env.NOVEL_MANAGER_HOST || '0.0.0.0',
    apiBase: process.env.NOVEL_MANAGER_API_BASE || '/api',
    database: {
        type: process.env.DB_TYPE || 'mysql',
        host: process.env.DB_HOST || '124.220.245.121',
        port: parseInt(process.env.DB_PORT || '22295'),
        user: process.env.DB_USER || 'openclaw',
        password: process.env.DB_PASSWORD || 'Lgp15237257500',
        database: process.env.DB_NAME || 'cloudbase-4glvyyq9f61b19cd',
        sqlitePath: normalizeLegacyPath(process.env.SQLITE_PATH || path.join('extensions', 'novel-manager', 'data', 'novel.db'), 'workspace'),
    },
    paths: getDefaultPaths(),
    scheduler: {
        enabled: process.env.SCHEDULER_ENABLED !== 'false',
        stateFile: normalizeLegacyPath(process.env.SCHEDULER_STATE_FILE || 'scheduler-state.json', 'runtime'),
        maxConcurrent: parseInt(process.env.SCHEDULER_MAX_CONCURRENT || '1'),
        retryAttempts: parseInt(process.env.SCHEDULER_RETRY_ATTEMPTS || '3'),
        retryInterval: parseInt(process.env.SCHEDULER_RETRY_INTERVAL || '5000'),
        polishUrl: process.env.POLISH_URL || 'https://7d4jcknzqk.coze.site',
        fanqieAccounts: [
            {
                id: 'account_1',
                name: '番茄账号1',
                browserDir: normalizeLegacyPath(path.join('browser', 'fanqie-account-1'), 'runtime'),
                cookiesFile: normalizeLegacyPath(path.join('cookies-accounts', 'fanqie-20260314-030709.json'), 'workspace'),
            },
            {
                id: 'account_2',
                name: '番茄账号2',
                browserDir: normalizeLegacyPath(path.join('browser', 'fanqie-account-2'), 'runtime'),
                cookiesFile: normalizeLegacyPath(path.join('cookies-accounts', 'fanqie-20260314-112322.json'), 'workspace'),
            },
        ],
    },
    ai: {
        model: process.env.AI_MODEL || 'qwen2.5:7b',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
        systemPrompt: process.env.AI_SYSTEM_PROMPT || `你是一位资深网络小说作家，擅长创作爽文小说。`,
    },
    log: {
        level: process.env.LOG_LEVEL || 'info',
        file: normalizeLegacyPath(process.env.LOG_FILE || 'novel-manager.log', 'runtime'),
        maxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    },
};
/**
 * 获取默认路径
 */
function getDefaultPaths() {
    const root = resolveNovelManagerModuleRoot();
    const runtimeModuleRoot = resolveRuntimePath('extensions', 'novel-manager');
    return {
        root,
        data: path.join(root, 'data'),
        logs: path.join(runtimeModuleRoot, 'logs'),
        cache: path.join(runtimeModuleRoot, 'cache'),
        temp: path.join(runtimeModuleRoot, 'temp'),
        storage: path.join(runtimeModuleRoot, 'storage'),
        browser: path.join(runtimeModuleRoot, 'browser'),
    };
}
// 全局配置缓存
let cachedConfig = null;
/**
 * 加载配置
 * 优先顺序：环境变量 > 配置文件 > 默认值
 */
function loadConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const configPath = process.env.NOVEL_MANAGER_CONFIG ||
        path.join(defaultConfig.paths.root, 'config', 'module.json');
    let fileConfig = {};
    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            fileConfig = JSON.parse(content);
        }
        catch (e) {
            console.warn('配置文件加载失败，使用默认配置:', e);
        }
    }
    // 深度合并配置
    cachedConfig = normalizeConfigPaths(deepMerge(defaultConfig, fileConfig));
    // 确保目录存在
    ensureDirectories(cachedConfig.paths);
    ensureRuntimeArtifacts(cachedConfig);
    return cachedConfig;
}
/**
 * 重新加载配置
 */
function reloadConfig() {
    cachedConfig = null;
    return loadConfig();
}
/**
 * 保存配置到文件
 */
function saveConfig(config) {
    const configPath = process.env.NOVEL_MANAGER_CONFIG ||
        path.join(config.paths.root, 'config', 'module.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    cachedConfig = config;
}
/**
 * 获取当前配置（快捷方式）
 */
function getConfig() {
    return loadConfig();
}
// 导出配置对象（向后兼容）
exports.config = loadConfig();
/**
 * 深度合并对象
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] !== undefined) {
            if (isObject(result[key]) && isObject(source[key])) {
                result[key] = deepMerge(result[key], source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
    }
    return result;
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
/**
 * 确保目录存在
 */
function ensureDirectories(paths) {
    Object.values(paths).forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
function ensureRuntimeArtifacts(config) {
    const dirs = [
        config.database.sqlitePath ? path.dirname(config.database.sqlitePath) : null,
        path.dirname(config.scheduler.stateFile),
        path.dirname(config.log.file),
        ...(config.scheduler.fanqieAccounts || []).map(account => account.browserDir),
        ...(config.scheduler.fanqieAccounts || []).map(account => path.dirname(account.cookiesFile)),
    ].filter(Boolean);
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
//# sourceMappingURL=config.js.map
