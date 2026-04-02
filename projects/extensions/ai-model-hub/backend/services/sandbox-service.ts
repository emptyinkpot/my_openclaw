import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import type { CodeAnalysisResult, ExecutionResult, SandboxConfig } from '../../contracts';
import { getPythonCommand } from '../../core/defaults';

const execAsync = promisify(exec);

export class SandboxService {
  private config: SandboxConfig;
  private ready = false;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.ready = false;
      return;
    }

    if (this.config.provider === 'docker') {
      try {
        await execAsync('docker --version', { timeout: 10000 });
        this.ready = true;
        return;
      } catch {
        this.config = { ...this.config, provider: 'local' };
      }
    }

    this.ready = true;
  }

  getReadyState(): boolean {
    return this.ready;
  }

  getConfig(): SandboxConfig {
    return {
      ...this.config,
      blockedModules: [...this.config.blockedModules],
    };
  }

  updateConfig(config: Partial<SandboxConfig>): SandboxConfig {
    this.config = {
      ...this.config,
      ...config,
      blockedModules: Array.isArray(config.blockedModules)
        ? [...config.blockedModules]
        : [...this.config.blockedModules],
    };
    return this.getConfig();
  }

  async analyzePythonCode(code: string): Promise<CodeAnalysisResult> {
    const fallback = this.createEmptyAnalysis();
    if (!this.config.astCheck) {
      return fallback;
    }

    const blockedModulesJson = JSON.stringify(this.config.blockedModules);
    const script = [
      'import ast',
      'import json',
      'import sys',
      '',
      'source = sys.stdin.read()',
      'tree = ast.parse(source)',
      `blocked_modules = ${blockedModulesJson}`,
      'dangerous_calls = {"eval", "exec", "__import__", "compile", "open", "input"}',
      'imports = []',
      'calls = []',
      'threats = []',
      '',
      'for node in ast.walk(tree):',
      '    if isinstance(node, ast.Import):',
      '        for alias in node.names:',
      '            imports.append(alias.name)',
      '            if any(blocked in alias.name for blocked in blocked_modules):',
      '                threats.append({"type": "dangerous_import", "line": getattr(node, "lineno", 0), "code": alias.name, "message": f"检测到危险模块导入: {alias.name}"})',
      '    elif isinstance(node, ast.ImportFrom):',
      '        module = node.module or ""',
      '        imports.append(module)',
      '        if any(blocked in module for blocked in blocked_modules):',
      '            threats.append({"type": "dangerous_import", "line": getattr(node, "lineno", 0), "code": module, "message": f"检测到危险模块导入: {module}"})',
      '    elif isinstance(node, ast.Call):',
      '        if isinstance(node.func, ast.Name):',
      '            call_name = node.func.id',
      '        elif isinstance(node.func, ast.Attribute):',
      '            call_name = node.func.attr',
      '        else:',
      '            call_name = ""',
      '        if call_name:',
      '            calls.append(call_name)',
      '            if call_name in dangerous_calls:',
      '                threats.append({"type": "dangerous_call", "line": getattr(node, "lineno", 0), "code": call_name, "message": f"检测到危险函数调用: {call_name}"})',
      '',
      'print(json.dumps({"safe": len(threats) == 0, "imports": imports, "calls": calls, "threats": threats}, ensure_ascii=False))',
    ].join('\n');

    try {
      const result = await this.runProcess(getPythonCommand(), ['-c', script], code, 15000);
      if (result.code !== 0) {
        throw new Error(result.stderr || 'Python AST 分析失败');
      }

      const parsed = JSON.parse(result.stdout || '{}');
      return {
        safe: Boolean(parsed.safe),
        imports: Array.isArray(parsed.imports) ? parsed.imports : [],
        functionCalls: Array.isArray(parsed.calls) ? parsed.calls : [],
        threats: Array.isArray(parsed.threats) ? parsed.threats : [],
      };
    } catch (error) {
      return {
        safe: false,
        imports: [],
        functionCalls: [],
        threats: [
          {
            type: 'dangerous_call',
            line: 0,
            code: '',
            message: error instanceof Error ? error.message : '无法完成 Python 安全分析',
          },
        ],
      };
    }
  }

  analyzeJavaScriptCode(code: string): CodeAnalysisResult {
    const result = this.createEmptyAnalysis();
    if (!this.config.astCheck) {
      return result;
    }

    const dangerousPatterns = [
      { pattern: /eval\s*\(/, type: 'dangerous_call', message: '检测到 eval 调用' },
      { pattern: /Function\s*\(/, type: 'dangerous_call', message: '检测到 Function 构造器' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, type: 'dangerous_import', message: '检测到 child_process 导入' },
      { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, type: 'file_access', message: '检测到文件系统访问' },
      { pattern: /require\s*\(\s*['"]http['"]\s*\)/, type: 'network_access', message: '检测到网络访问' },
      { pattern: /fetch\s*\(/, type: 'network_access', message: '检测到网络请求' },
    ] as const;

    const lines = code.split(/\r?\n/);

    lines.forEach((line, index) => {
      const importMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (importMatch) {
        result.imports.push(importMatch[1]);
      }

      for (const item of dangerousPatterns) {
        if (item.pattern.test(line)) {
          result.threats.push({
            type: item.type,
            line: index + 1,
            code: line.trim(),
            message: item.message,
          });
        }
      }
    });

    result.safe = result.threats.length === 0;
    return result;
  }

  async executeCode(code: string, language: 'python' | 'javascript', timeout = 30000): Promise<ExecutionResult> {
    const startTime = Date.now();
    const analysis = language === 'python'
      ? await this.analyzePythonCode(code)
      : this.analyzeJavaScriptCode(code);

    if (!analysis.safe) {
      return {
        success: false,
        output: '',
        error: `检测到安全风险:\n${analysis.threats.map((item) => `- ${item.message}`).join('\n')}`,
        executionTime: Date.now() - startTime,
      };
    }

    if (this.config.provider === 'docker') {
      return this.executeWithDocker(code, language, timeout, startTime);
    }

    if (this.config.provider === 'e2b') {
      return this.executeWithE2B(code, language, timeout, startTime);
    }

    return this.executeWithLocal(code, language, timeout, startTime);
  }

  private async executeWithE2B(
    code: string,
    language: 'python' | 'javascript',
    timeout: number,
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)') as (
        specifier: string
      ) => Promise<any>;
      const e2bModule = await dynamicImport('e2b').catch(() => null);
      if (!e2bModule?.Sandbox) {
        throw new Error('E2B 运行库未安装');
      }

      const sandbox = await e2bModule.Sandbox.create();
      let output = '';

      if (language === 'python') {
        const result = await sandbox.runPython(code, { timeout });
        output = `${result.logs.stdout || ''}${result.logs.stderr || ''}`;
      } else {
        const result = await sandbox.process.start({
          cmd: 'node',
          args: ['-e', code],
        });
        output = result.output || '';
      }

      await sandbox.close();
      return {
        success: true,
        output,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'E2B 执行失败',
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async executeWithDocker(
    code: string,
    language: 'python' | 'javascript',
    timeout: number,
    startTime: number
  ): Promise<ExecutionResult> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-hub-sandbox-'));
    const fileName = language === 'python' ? 'script.py' : 'script.js';
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, code, 'utf8');

    const image = language === 'python' ? 'python:3.11-slim' : 'node:18-slim';
    const command = language === 'python' ? 'python' : 'node';
    const volumePath = tempDir.replace(/\\/g, '/');

    try {
      const { stdout, stderr } = await execAsync(
        `docker run --rm --network none --memory 512m --cpus 1 -v "${volumePath}:/code" ${image} ${command} /code/${fileName}`,
        { timeout }
      );

      return {
        success: true,
        output: `${stdout}${stderr}`,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Docker 执行失败',
        executionTime: Date.now() - startTime,
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  private async executeWithLocal(
    code: string,
    language: 'python' | 'javascript',
    timeout: number,
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      const command = language === 'python' ? getPythonCommand() : process.execPath;
      const args = language === 'python' ? ['-c', code] : ['-e', code];
      const result = await this.runProcess(command, args, '', timeout);

      return {
        success: result.code === 0,
        output: result.stdout,
        error: result.stderr || undefined,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : '本地执行失败',
        executionTime: Date.now() - startTime,
      };
    }
  }

  private createEmptyAnalysis(): CodeAnalysisResult {
    return {
      safe: true,
      threats: [],
      imports: [],
      functionCalls: [],
    };
  }

  private runProcess(
    command: string,
    args: string[],
    input: string,
    timeout: number
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const processHandle = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let finished = false;
      const timer = setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        processHandle.kill();
        reject(new Error(`进程执行超时: ${command}`));
      }, timeout);

      processHandle.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      processHandle.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      processHandle.on('error', (error) => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timer);
        reject(error);
      });

      processHandle.on('close', (code) => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timer);
        resolve({
          code: code ?? 0,
          stdout,
          stderr,
        });
      });

      if (input) {
        processHandle.stdin.write(input);
      }
      processHandle.stdin.end();
    });
  }
}
