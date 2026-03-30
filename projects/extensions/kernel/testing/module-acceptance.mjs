#!/usr/bin/env node

import fs from 'fs';
import net from 'net';
import http from 'http';
import https from 'https';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionsRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(extensionsRoot, '..');
const defaultConfigPath = path.join(projectRoot, 'openclaw.json');
const defaultPresetPath = path.join(__dirname, 'module-acceptance.presets.json');
const defaultScanGlobs = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs', '*.html', '*.css', '*.json'];
const startTimeoutMs = 90000;
const requestTimeoutMs = 30000;

function printHelp() {
  console.log(`
用法:
  node ./kernel/testing/module-acceptance.mjs --module <模块名> [--port <端口>] [--keep-gateway]

示例:
  npm run accept:module -- --module experience-manager
  npm run accept:module -- --module automation-hub --port 5021
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function resolveProjectPath(targetPath) {
  if (!targetPath) {
    return targetPath;
  }

  return path.isAbsolute(targetPath) ? targetPath : path.resolve(projectRoot, targetPath);
}

function normalizePath(targetPath) {
  return targetPath.replace(/\\/g, '/');
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runShell(command, options = {}) {
  return spawnSync(command, {
    cwd: options.cwd || projectRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function randomPort() {
  return 5100 + Math.floor(Math.random() * 400);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(port, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`隔离网关提前退出，退出码 ${child.exitCode}`);
    }

    const connected = await new Promise((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port });

      const finish = (value) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(value);
      };

      socket.setTimeout(800);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
    });

    if (connected) {
      await sleep(1500);
      return;
    }

    await sleep(1000);
  }

  throw new Error(`等待隔离网关监听端口 ${port} 超时`);
}

function requestUrl(url, token, timeoutMs) {
  const client = url.startsWith('https:') ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`请求超时: ${url}`));
    });

    req.on('error', reject);
    req.end();
  });
}

function buildGatewayCommand(port, token) {
  return `openclaw gateway run --port ${port} --token "${token}" --force --verbose`;
}

function spawnGateway(port, token, configPath, stateDir, logPath) {
  ensureDir(path.dirname(logPath));
  ensureDir(stateDir);

  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const env = {
    ...process.env,
    OPENCLAW_CONFIG_PATH: configPath,
    OPENCLAW_STATE_DIR: stateDir,
  };

  const command = buildGatewayCommand(port, token);
  const child =
    process.platform === 'win32'
      ? spawn(
          'powershell.exe',
          ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
          { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'] }
        )
      : spawn('sh', ['-lc', command], { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  return { child, logStream };
}

function killGateway(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    return;
  }

  try {
    process.kill(child.pid, 'SIGKILL');
  } catch {
    // ignore
  }
}

function parseRgMatches(output, allowPaths = []) {
  const matches = [];
  const lines = output.split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (parsed.type !== 'match') {
      continue;
    }

    const filePath = normalizePath(parsed.data.path.text || '');
    if (allowPaths.some((item) => filePath.includes(normalizePath(item)))) {
      continue;
    }

    matches.push({
      path: filePath,
      line: parsed.data.line_number || 0,
      preview: (parsed.data.lines.text || '').trim(),
    });
  }

  return matches;
}

function runLegacySearches(preset) {
  const searches = preset.legacySearches || [];
  const scanPaths = (preset.scanPaths || []).map(resolveProjectPath);
  const issues = [];

  for (const search of searches) {
    const args = ['--json', '-n', '-F', '--hidden', '-g', '!node_modules', '-g', '!dist'];
    for (const glob of defaultScanGlobs) {
      args.push('-g', glob);
    }

    args.push(search.value, ...scanPaths.map((item) => `"${item}"`));
    const command = `rg ${args.join(' ')}`;
    const result = runShell(command);

    if (result.status !== 0 && result.status !== 1) {
      throw new Error(`旧路径扫描失败: ${search.label || search.value}\n${result.stderr || result.stdout}`);
    }

    const matches = parseRgMatches(result.stdout || '', search.allowPaths || []);
    if (matches.length > 0) {
      issues.push({
        label: search.label || search.value,
        value: search.value,
        matches,
      });
    }
  }

  return issues;
}

async function runHttpChecks(port, token, checks, kindLabel) {
  const failures = [];
  const results = [];

  for (const check of checks) {
    const url = `http://127.0.0.1:${port}${check.path}`;
    const response = await requestUrl(url, token, requestTimeoutMs);
    const containsAll = check.containsAll || [];
    const missing = containsAll.filter((item) => !response.body.includes(item));

    results.push({
      path: check.path,
      statusCode: response.statusCode,
      bodyLength: response.body.length,
    });

    if (response.statusCode !== 200 || missing.length > 0) {
      failures.push({
        path: check.path,
        statusCode: response.statusCode,
        missing,
        preview: response.body.slice(0, 200),
        kindLabel,
      });
    }
  }

  return { failures, results };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || !args.module) {
    printHelp();
    process.exit(args.module ? 0 : 1);
  }

  const presetPath = resolveProjectPath(args['preset-file'] || defaultPresetPath);
  const presets = loadJson(presetPath);
  const preset = presets[args.module];

  if (!preset) {
    throw new Error(`未找到模块预设: ${args.module}`);
  }

  const displayName = preset.displayName || args.module;
  const configPath = resolveProjectPath(args.config || defaultConfigPath);
  const config = loadJson(configPath);
  const token = config?.gateway?.auth?.token;

  if (!token) {
    throw new Error(`配置文件中缺少 gateway.auth.token: ${configPath}`);
  }

  const port = Number.parseInt(args.port || `${randomPort()}`, 10);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseRuntimeDir = path.resolve(projectRoot, '..', '.runtime', 'module-acceptance');
  const stateDir = resolveProjectPath(args['state-dir'] || path.join(baseRuntimeDir, `${args.module}-${timestamp}`, 'state'));
  const logPath = resolveProjectPath(args.log || path.join(baseRuntimeDir, `${args.module}-${timestamp}.log`));
  const tsconfigPath = resolveProjectPath(preset.tsconfig);
  const moduleDir = path.dirname(tsconfigPath);

  console.log(`开始验收模块: ${displayName} (${args.module})`);
  console.log(`隔离端口: ${port}`);
  console.log(`隔离状态目录: ${stateDir}`);
  console.log(`日志文件: ${logPath}`);

  if (preset.tsconfig) {
    console.log('\n[1/4] 类型检查');
    const typecheck = runShell(`npm exec --workspaces=false --prefix "${moduleDir}" -- tsc -p "${tsconfigPath}" --noEmit`);
    if (typecheck.status !== 0) {
      throw new Error(`类型检查失败:\n${typecheck.stdout || ''}\n${typecheck.stderr || ''}`);
    }
    console.log('通过');
  }

  console.log('\n[2/4] 启动隔离网关');
  const { child, logStream } = spawnGateway(port, token, configPath, stateDir, logPath);

  try {
    await waitForPort(port, child, startTimeoutMs);
    console.log('通过');

    console.log('\n[3/4] 页面与 API 验收');
    const pageChecks = await runHttpChecks(port, token, preset.pageChecks || [], '页面');
    const apiChecks = await runHttpChecks(port, token, preset.apiChecks || [], 'API');
    const httpFailures = [...pageChecks.failures, ...apiChecks.failures];

    if (httpFailures.length > 0) {
      const detail = httpFailures
        .map((item) => {
          const missing = item.missing?.length ? `缺少关键内容: ${item.missing.join(', ')}` : '无';
          return `- ${item.kindLabel} ${item.path} 返回 ${item.statusCode}，${missing}\n  预览: ${item.preview}`;
        })
        .join('\n');
      throw new Error(`HTTP 验收失败:\n${detail}`);
    }

    for (const item of [...pageChecks.results, ...apiChecks.results]) {
      console.log(`通过 ${item.path} (${item.statusCode})`);
    }

    console.log('\n[4/4] 旧路径扫描');
    const searchIssues = runLegacySearches(preset);
    if (searchIssues.length > 0) {
      const detail = searchIssues
        .map((issue) => {
          const matches = issue.matches
            .slice(0, 5)
            .map((match) => `  - ${match.path}:${match.line} ${match.preview}`)
            .join('\n');
          return `- ${issue.label} 仍有残留\n${matches}`;
        })
        .join('\n');
      throw new Error(`旧路径扫描失败:\n${detail}`);
    }
    console.log('通过');

    console.log(`\n验收完成: ${displayName} (${args.module})`);
    console.log(`可复用命令: npm run accept:module -- --module ${args.module}`);
  } finally {
    if (!args['keep-gateway']) {
      killGateway(child);
    }

    await sleep(800);
    logStream.end();
  }
}

main().catch((error) => {
  console.error(`\n验收失败: ${error.message}`);
  process.exit(1);
});
