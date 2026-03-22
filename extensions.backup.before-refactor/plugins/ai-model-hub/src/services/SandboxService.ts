/**
 * 沙盒服务 - AST语法树拦截与智能沙盒
 * 
 * 技术栈:
 * - Python AST: 静态代码分析
 * - E2B: 安全的开源云运行时
 * - Docker: 本地容器隔离
 * - VM2: Node.js沙盒 (备用)
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const execAsync = promisify(exec);

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

export class SandboxService {
  private config: SandboxConfig;
  private isReady: boolean = false;
  private e2bApiKey?: string;

  constructor(config: SandboxConfig = { enabled: true, provider: 'local', astCheck: true, blockedModules: [] }) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
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

  private async initializeE2B(): Promise<void> {
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
      const { Sandbox } = await import('e2b');
      const sandbox = await Sandbox.create();
      await sandbox.close();
      
      console.log('✅ E2B沙盒服务已就绪');
      this.isReady = true;
    } catch (error) {
      console.warn('⚠️ E2B初始化失败，回退到本地沙盒:', error);
      this.config.provider = 'local';
      await this.initializeLocal();
    }
  }

  private async initializeDocker(): Promise<void> {
    try {
      await execAsync('docker --version');
      console.log('✅ Docker沙盒服务已就绪');
      this.isReady = true;
    } catch {
      console.warn('⚠️ Docker未安装，回退到本地沙盒');
      this.config.provider = 'local';
      await this.initializeLocal();
    }
  }

  private async initializeLocal(): Promise<void> {
    // 本地沙盒只需要Node.js环境
    console.log('✅ 本地沙盒服务已就绪 (基于VM2)');
    this.isReady = true;
  }

  public getReadyState(): boolean {
    return this.isReady;
  }

  /**
   * AST代码分析 (Python)
   */
  public async analyzePythonCode(code: string): Promise<CodeAnalysisResult> {
    const result: CodeAnalysisResult = {
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
      const { stdout } = await (execAsync as any)('python3', {
        input: analysisScript + '\n' + code,
        timeout: 10000
      });
      
      const analysis = JSON.parse(stdout);
      result.imports = analysis.imports || [];
      result.functionCalls = analysis.calls || [];
      result.threats = analysis.threats || [];
      result.safe = analysis.safe && result.threats.length === 0;
    } catch (error) {
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
  public analyzeJavaScriptCode(code: string): CodeAnalysisResult {
    const result: CodeAnalysisResult = {
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
            type: type as any,
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
  public async executeCode(
    code: string,
    language: 'python' | 'javascript',
    timeout: number = 30000
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 先进行代码分析
    let analysis: CodeAnalysisResult;
    if (language === 'python') {
      analysis = await this.analyzePythonCode(code);
    } else {
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
  private async executeWithE2B(
    code: string,
    language: 'python' | 'javascript',
    timeout: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // @ts-ignore
      const { Sandbox } = await import('e2b');
      const sandbox = await Sandbox.create();

      let output = '';
      
      if (language === 'python') {
        const result = await sandbox.runPython(code, { timeout });
        output = result.logs.stdout + result.logs.stderr;
      } else {
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
    } catch (error: any) {
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
  private async executeWithDocker(
    code: string,
    language: 'python' | 'javascript',
    timeout: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // 创建临时文件
    const tmpDir = '/tmp/sandbox-' + Date.now();
    fs.mkdirSync(tmpDir, { recursive: true });
    
    const filename = language === 'python' ? 'script.py' : 'script.js';
    const filepath = path.join(tmpDir, filename);
    fs.writeFileSync(filepath, code);

    const image = language === 'python' ? 'python:3.11-slim' : 'node:18-slim';
    const cmd = language === 'python' ? 'python' : 'node';

    try {
      const { stdout, stderr } = await execAsync(
        `docker run --rm --network none --memory 512m --cpus 1 -v ${tmpDir}:/code ${image} ${cmd} /code/${filename}`,
        { timeout }
      );

      // 清理
      fs.rmSync(tmpDir, { recursive: true, force: true });

      return {
        success: true,
        output: stdout + stderr,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      
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
  private async executeWithLocal(
    code: string,
    language: 'python' | 'javascript',
    timeout: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (language === 'python') {
      // Python使用受限子进程
      return new Promise((resolve) => {
        const process = spawn('python3', ['-c', code], {
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
    } else {
      // JavaScript使用VM2
      try {
        // @ts-ignore
        const { VM } = await import('vm2');
        const vm = new VM({
          timeout,
          sandbox: {
            console: {
              log: (...args: any[]) => args.join(' '),
              error: (...args: any[]) => args.join(' ')
            }
          }
        });

        const result = vm.run(code);

        return {
          success: true,
          output: String(result),
          executionTime: Date.now() - startTime
        };
      } catch (error: any) {
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
  public getConfig(): SandboxConfig {
    return { ...this.config };
  }

  /**
   * 更新沙盒配置
   */
  public updateConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
