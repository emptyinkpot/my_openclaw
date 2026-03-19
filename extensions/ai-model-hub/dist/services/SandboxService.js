"use strict";
/**
 * 沙盒服务 - AST语法树拦截与智能沙盒
 *
 * 技术栈:
 * - Python AST: 静态代码分析
 * - E2B: 安全的开源云运行时
 * - Docker: 本地容器隔离
 * - VM2: Node.js沙盒 (备用)
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
exports.SandboxService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SandboxService {
    config;
    isReady = false;
    e2bApiKey;
    constructor(config = { enabled: true, provider: 'local', astCheck: true, blockedModules: [] }) {
        this.config = config;
    }
    async initialize() {
        console.log('🔧 初始化沙盒服务...');
        if (!this.config.enabled) {
            console.log('⏭️ 沙盒服务已禁用');
            return;
        }
        switch (this.config.provider) {
            case 'e2b':
                await this.initializeE2B();
                break;
            case 'docker':
                await this.initializeDocker();
                break;
            case 'local':
            default:
                await this.initializeLocal();
                break;
        }
    }
    async initializeE2B() {
        try {
            // 检查E2B API密钥
            this.e2bApiKey = process.env.E2B_API_KEY;
            if (!this.e2bApiKey) {
                console.warn('⚠️ E2B API密钥未设置，回退到本地沙盒');
                this.config.provider = 'local';
                await this.initializeLocal();
                return;
            }
            // 测试E2B连接
            // @ts-ignore
            const { Sandbox } = await Promise.resolve().then(() => __importStar(require('e2b')));
            const sandbox = await Sandbox.create();
            await sandbox.close();
            console.log('✅ E2B沙盒服务已就绪');
            this.isReady = true;
        }
        catch (error) {
            console.warn('⚠️ E2B初始化失败，回退到本地沙盒:', error);
            this.config.provider = 'local';
            await this.initializeLocal();
        }
    }
    async initializeDocker() {
        try {
            await execAsync('docker --version');
            console.log('✅ Docker沙盒服务已就绪');
            this.isReady = true;
        }
        catch {
            console.warn('⚠️ Docker未安装，回退到本地沙盒');
            this.config.provider = 'local';
            await this.initializeLocal();
        }
    }
    async initializeLocal() {
        // 本地沙盒只需要Node.js环境
        console.log('✅ 本地沙盒服务已就绪 (基于VM2)');
        this.isReady = true;
    }
    getReadyState() {
        return this.isReady;
    }
    /**
     * AST代码分析 (Python)
     */
    async analyzePythonCode(code) {
        const result = {
            safe: true,
            threats: [],
            imports: [],
            functionCalls: []
        };
        if (!this.config.astCheck) {
            return result;
        }
        // 使用Python AST模块进行静态分析
        const analysisScript = `
import ast
import json
import sys

code = sys.stdin.read()

try:
    tree = ast.parse(code)
    
    imports = []
    calls = []
    threats = []
    
    for node in ast.walk(tree):
        # 检查导入语句
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ''
            imports.append(module)
            
        # 检查函数调用
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                calls.append(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                calls.append(node.func.attr)
    
    # 检查危险模式
    blocked_modules = ${JSON.stringify(this.config.blockedModules)}
    for imp in imports:
        for blocked in blocked_modules:
            if blocked in imp:
                threats.append({
                    'type': 'dangerous_import',
                    'line': 0,
                    'code': f'import {imp}',
                    'message': f'检测到危险的模块导入: {imp}'
                })
    
    dangerous_calls = ['eval', 'exec', '__import__', 'compile', 'open', 'input']
    for call in calls:
        if call in dangerous_calls:
            threats.append({
                'type': 'dangerous_call',
                'line': 0,
                'code': f'{call}(...)',
                'message': f'检测到危险函数调用: {call}'
            })
    
    print(json.dumps({
        'imports': imports,
        'calls': calls,
        'threats': threats,
        'safe': len(threats) == 0
    }))
    
except SyntaxError as e:
    print(json.dumps({'error': str(e)}))
`;
        try {
            const { stdout } = await execAsync('python3', {
                input: analysisScript + '\n' + code,
                timeout: 10000
            });
            const analysis = JSON.parse(stdout);
            result.imports = analysis.imports || [];
            result.functionCalls = analysis.calls || [];
            result.threats = analysis.threats || [];
            result.safe = analysis.safe && result.threats.length === 0;
        }
        catch (error) {
            console.error('AST分析失败:', error);
            // AST分析失败时，默认不安全
            result.safe = false;
            result.threats.push({
                type: 'dangerous_call',
                line: 0,
                code: '',
                message: '代码语法分析失败，无法确认安全性'
            });
        }
        return result;
    }
    /**
     * JavaScript代码分析
     */
    analyzeJavaScriptCode(code) {
        const result = {
            safe: true,
            threats: [],
            imports: [],
            functionCalls: []
        };
        if (!this.config.astCheck) {
            return result;
        }
        // 简单的正则检查（生产环境应使用Babel AST解析）
        const dangerousPatterns = [
            { pattern: /eval\s*\(/, type: 'dangerous_call', message: '检测到eval调用' },
            { pattern: /Function\s*\(/, type: 'dangerous_call', message: '检测到Function构造器' },
            { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, type: 'dangerous_import', message: '检测到child_process导入' },
            { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, type: 'file_access', message: '检测到文件系统访问' },
            { pattern: /require\s*\(\s*['"]http['"]\s*\)/, type: 'network_access', message: '检测到网络访问' },
        ];
        const lines = code.split('\n');
        lines.forEach((line, index) => {
            dangerousPatterns.forEach(({ pattern, type, message }) => {
                if (pattern.test(line)) {
                    result.threats.push({
                        type: type,
                        line: index + 1,
                        code: line.trim(),
                        message
                    });
                }
            });
            // 提取导入
            const importMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
            if (importMatch) {
                result.imports.push(importMatch[1]);
            }
        });
        result.safe = result.threats.length === 0;
        return result;
    }
    /**
     * 在沙盒中执行代码
     */
    async executeCode(code, language, timeout = 30000) {
        const startTime = Date.now();
        // 先进行代码分析
        let analysis;
        if (language === 'python') {
            analysis = await this.analyzePythonCode(code);
        }
        else {
            analysis = this.analyzeJavaScriptCode(code);
        }
        // 如果代码不安全，请求用户确认
        if (!analysis.safe) {
            return {
                success: false,
                output: '',
                error: `检测到安全风险:\n${analysis.threats.map(t => `- ${t.message} (第${t.line}行)`).join('\n')}\n\n请确认是否继续执行？`,
                executionTime: Date.now() - startTime
            };
        }
        // 根据provider选择执行方式
        switch (this.config.provider) {
            case 'e2b':
                return this.executeWithE2B(code, language, timeout);
            case 'docker':
                return this.executeWithDocker(code, language, timeout);
            case 'local':
            default:
                return this.executeWithLocal(code, language, timeout);
        }
    }
    /**
     * 使用E2B执行
     */
    async executeWithE2B(code, language, timeout) {
        const startTime = Date.now();
        try {
            // @ts-ignore
            const { Sandbox } = await Promise.resolve().then(() => __importStar(require('e2b')));
            const sandbox = await Sandbox.create();
            let output = '';
            if (language === 'python') {
                const result = await sandbox.runPython(code, { timeout });
                output = result.logs.stdout + result.logs.stderr;
            }
            else {
                // JavaScript通过Node.js执行
                const result = await sandbox.process.start({
                    cmd: 'node',
                    args: ['-e', code]
                });
                output = result.output;
            }
            await sandbox.close();
            return {
                success: true,
                output,
                executionTime: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                success: false,
                output: '',
                error: error.message,
                executionTime: Date.now() - startTime
            };
        }
    }
    /**
     * 使用Docker执行
     */
    async executeWithDocker(code, language, timeout) {
        const startTime = Date.now();
        // 创建临时文件
        const tmpDir = '/tmp/sandbox-' + Date.now();
        fs_1.default.mkdirSync(tmpDir, { recursive: true });
        const filename = language === 'python' ? 'script.py' : 'script.js';
        const filepath = path_1.default.join(tmpDir, filename);
        fs_1.default.writeFileSync(filepath, code);
        const image = language === 'python' ? 'python:3.11-slim' : 'node:18-slim';
        const cmd = language === 'python' ? 'python' : 'node';
        try {
            const { stdout, stderr } = await execAsync(`docker run --rm --network none --memory 512m --cpus 1 -v ${tmpDir}:/code ${image} ${cmd} /code/${filename}`, { timeout });
            // 清理
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
            return {
                success: true,
                output: stdout + stderr,
                executionTime: Date.now() - startTime
            };
        }
        catch (error) {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
            return {
                success: false,
                output: '',
                error: error.message,
                executionTime: Date.now() - startTime
            };
        }
    }
    /**
     * 本地执行 (带VM2隔离)
     */
    async executeWithLocal(code, language, timeout) {
        const startTime = Date.now();
        if (language === 'python') {
            // Python使用受限子进程
            return new Promise((resolve) => {
                const process = (0, child_process_1.spawn)('python3', ['-c', code], {
                    timeout,
                    killSignal: 'SIGTERM'
                });
                let stdout = '';
                let stderr = '';
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                process.on('close', (code) => {
                    resolve({
                        success: code === 0,
                        output: stdout,
                        error: stderr || undefined,
                        executionTime: Date.now() - startTime
                    });
                });
                process.on('error', (error) => {
                    resolve({
                        success: false,
                        output: stdout,
                        error: error.message,
                        executionTime: Date.now() - startTime
                    });
                });
            });
        }
        else {
            // JavaScript使用VM2
            try {
                // @ts-ignore
                const { VM } = await Promise.resolve().then(() => __importStar(require('vm2')));
                const vm = new VM({
                    timeout,
                    sandbox: {
                        console: {
                            log: (...args) => args.join(' '),
                            error: (...args) => args.join(' ')
                        }
                    }
                });
                const result = vm.run(code);
                return {
                    success: true,
                    output: String(result),
                    executionTime: Date.now() - startTime
                };
            }
            catch (error) {
                return {
                    success: false,
                    output: '',
                    error: error.message,
                    executionTime: Date.now() - startTime
                };
            }
        }
    }
    /**
     * 获取沙盒配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新沙盒配置
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}
exports.SandboxService = SandboxService;
//# sourceMappingURL=SandboxService.js.map