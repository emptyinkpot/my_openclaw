/**
 * 沙盒服务 - AST语法树拦截与智能沙盒
 *
 * 技术栈:
 * - Python AST: 静态代码分析
 * - E2B: 安全的开源云运行时
 * - Docker: 本地容器隔离
 * - VM2: Node.js沙盒 (备用)
 */
export interface SandboxConfig {
    enabled: boolean;
    provider: 'e2b' | 'local' | 'docker';
    astCheck: boolean;
    blockedModules: string[];
}
export interface CodeAnalysisResult {
    safe: boolean;
    threats: Array<{
        type: 'dangerous_import' | 'dangerous_call' | 'network_access' | 'file_access';
        line: number;
        code: string;
        message: string;
    }>;
    imports: string[];
    functionCalls: string[];
}
export interface ExecutionResult {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
    memoryUsage?: number;
}
export declare class SandboxService {
    private config;
    private isReady;
    private e2bApiKey?;
    constructor(config?: SandboxConfig);
    initialize(): Promise<void>;
    private initializeE2B;
    private initializeDocker;
    private initializeLocal;
    getReadyState(): boolean;
    /**
     * AST代码分析 (Python)
     */
    analyzePythonCode(code: string): Promise<CodeAnalysisResult>;
    /**
     * JavaScript代码分析
     */
    analyzeJavaScriptCode(code: string): CodeAnalysisResult;
    /**
     * 在沙盒中执行代码
     */
    executeCode(code: string, language: 'python' | 'javascript', timeout?: number): Promise<ExecutionResult>;
    /**
     * 使用E2B执行
     */
    private executeWithE2B;
    /**
     * 使用Docker执行
     */
    private executeWithDocker;
    /**
     * 本地执行 (带VM2隔离)
     */
    private executeWithLocal;
    /**
     * 获取沙盒配置
     */
    getConfig(): SandboxConfig;
    /**
     * 更新沙盒配置
     */
    updateConfig(config: Partial<SandboxConfig>): void;
}
//# sourceMappingURL=SandboxService.d.ts.map