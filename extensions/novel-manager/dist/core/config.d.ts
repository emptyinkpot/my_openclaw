/**
 * 模块配置管理
 * 自包含配置系统，支持环境变量覆盖
 */
/**
 * 模块配置接口
 */
export interface ModuleConfig {
    port: number;
    host: string;
    apiBase: string;
    database: {
        type: 'mysql' | 'sqlite';
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        sqlitePath?: string;
    };
    paths: {
        root: string;
        data: string;
        logs: string;
        cache: string;
        temp: string;
        storage: string;
        browser: string;
    };
    scheduler: {
        enabled: boolean;
        stateFile: string;
        maxConcurrent: number;
        retryAttempts: number;
        retryInterval: number;
        polishUrl: string;
        fanqieAccounts: Array<{
            id: string;
            name: string;
            browserDir: string;
            cookiesFile: string;
        }>;
    };
    ai: {
        model: string;
        temperature: number;
        maxTokens: number;
        systemPrompt: string;
    };
    log: {
        level: 'debug' | 'info' | 'warn' | 'error';
        file: string;
        maxSize: number;
        maxFiles: number;
    };
}
/**
 * 加载配置
 * 优先顺序：环境变量 > 配置文件 > 默认值
 */
export declare function loadConfig(): ModuleConfig;
/**
 * 重新加载配置
 */
export declare function reloadConfig(): ModuleConfig;
/**
 * 保存配置到文件
 */
export declare function saveConfig(config: ModuleConfig): void;
/**
 * 获取当前配置（快捷方式）
 */
export declare function getConfig(): ModuleConfig;
export declare const config: ModuleConfig;
//# sourceMappingURL=config.d.ts.map