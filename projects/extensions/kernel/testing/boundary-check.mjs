#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionsRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(extensionsRoot, '..');
const workspaceRoot = path.resolve(projectRoot, '..');

const textFileExts = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.html',
  '.ps1',
  '.bat',
  '.cmd',
]);

const codeFileExts = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.html',
]);

const skipDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.runtime',
  'tmp',
  '.trash',
  '.local',
  'memory',
  'docs',
  'knowledge',
  'mirror',
]);

const requiredModuleFields = [
  'id',
  'displayName',
  'version',
  'routePrefix',
  'apiPrefix',
  'nav',
  'pages',
  'capabilities',
  'runtimeDirs',
];

const bannedSharedNavEntries = ['/project-structure.html', '/novel-manager.html', '/auto.html', '/automation.html'];

function normalizePath(targetPath) {
  return targetPath.replace(/\\/g, '/');
}

function relFromWorkspace(targetPath) {
  return normalizePath(path.relative(workspaceRoot, targetPath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkFiles(rootDir, visitor) {
  if (!fs.existsSync(rootDir)) {
    return;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!textFileExts.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }

      visitor(fullPath);
    }
  }
}

function scanText(rootDirs, regex, options = {}) {
  const matches = [];
  const allowedExts = options.allowedExts || textFileExts;
  const ignorePathIncludes = options.ignorePathIncludes || [];

  for (const rootDir of rootDirs) {
    walkFiles(rootDir, (filePath) => {
      const normalizedFile = normalizePath(filePath);
      if (ignorePathIncludes.some((token) => normalizedFile.includes(token))) {
        return;
      }

      if (!allowedExts.has(path.extname(filePath).toLowerCase())) {
        return;
      }

      const text = fs.readFileSync(filePath, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        regex.lastIndex = 0;
        if (regex.test(lines[i])) {
          matches.push({
            file: relFromWorkspace(filePath),
            line: i + 1,
            preview: lines[i].trim().slice(0, 220),
          });
        }
      }
    });
  }

  return matches;
}

function listModuleRoots() {
  const entries = fs.readdirSync(extensionsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, dir: path.join(extensionsRoot, entry.name) }))
    .filter((item) => !['core', 'kernel', 'plugins'].includes(item.name));
}

function filterNoiseMatches(matches, tokens = []) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return matches;
  }

  return matches.filter((item) => !tokens.some((token) => item.file.includes(token)));
}

function checkPluginLoadPaths() {
  const configPath = path.join(projectRoot, 'openclaw.json');
  const config = readJson(configPath);
  const pluginPaths = config?.plugins?.load?.paths || [];
  const violations = [];

  for (const pluginPath of pluginPaths) {
    const normalized = normalizePath(String(pluginPath || ''));
    if (/\/plugin\/?$/i.test(normalized)) {
      violations.push(normalized);
    }
  }

  return violations;
}

function checkModuleJsonIntegrity() {
  const issues = [];
  const modules = listModuleRoots();

  for (const mod of modules) {
    const moduleJsonPath = path.join(mod.dir, 'module.json');
    if (!fs.existsSync(moduleJsonPath)) {
      continue;
    }

    const data = readJson(moduleJsonPath);
    const missing = requiredModuleFields.filter((key) => data[key] === undefined || data[key] === null);
    if (missing.length > 0) {
      issues.push({ module: mod.name, issue: `missing fields: ${missing.join(', ')}` });
      continue;
    }

    if (!Array.isArray(data.nav) || data.nav.length === 0) {
      issues.push({ module: mod.name, issue: 'nav must be a non-empty array' });
    }
    if (!Array.isArray(data.pages) || data.pages.length === 0) {
      issues.push({ module: mod.name, issue: 'pages must be a non-empty array' });
    }
    if (!Array.isArray(data.runtimeDirs)) {
      issues.push({ module: mod.name, issue: 'runtimeDirs must be an array' });
    }

    if (typeof data.routePrefix === 'string' && typeof data.apiPrefix === 'string') {
      if (data.routePrefix === data.apiPrefix || data.apiPrefix.startsWith(`${data.routePrefix}/`)) {
        issues.push({
          module: mod.name,
          issue: `routePrefix (${data.routePrefix}) conflicts with apiPrefix (${data.apiPrefix})`,
        });
      }
    }
  }

  return issues;
}

function checkRuntimeResidue() {
  const modules = listModuleRoots();
  const issues = [];

  for (const mod of modules) {
    const moduleJsonPath = path.join(mod.dir, 'module.json');
    if (!fs.existsSync(moduleJsonPath)) {
      continue;
    }

    const data = readJson(moduleJsonPath);
    const runtimeDirs = Array.isArray(data.runtimeDirs) ? data.runtimeDirs : [];
    for (const runtimeDir of runtimeDirs) {
      const targetDir = path.join(mod.dir, String(runtimeDir));
      if (fs.existsSync(targetDir)) {
        issues.push(`${mod.name}/${runtimeDir}`);
      }
    }

    for (const fallback of ['cache', 'logs', 'temp', 'storage', 'state', 'runtime']) {
      const targetDir = path.join(mod.dir, fallback);
      if (fs.existsSync(targetDir) && !runtimeDirs.includes(fallback)) {
        issues.push(`${mod.name}/${fallback}`);
      }
    }
  }

  return Array.from(new Set(issues)).sort();
}

function checkSharedNavEntries() {
  const targets = [
    path.join(projectRoot, 'extensions', 'shared', 'nav-bar.html'),
    path.join(projectRoot, 'control-ui-custom', 'shared', 'nav-bar.html'),
    path.join(projectRoot, 'control-ui-custom', 'assets', 'nav-bar.html'),
  ];

  const issues = [];
  for (const filePath of targets) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      for (const banned of bannedSharedNavEntries) {
        if (lines[i].includes(banned)) {
          issues.push(`${relFromWorkspace(filePath)}:${i + 1} ${banned}`);
        }
      }
    }
  }

  return issues;
}

function checkCrossModuleDeepImports() {
  const regex = /extensions\/(?!kernel|core|plugins)([^/]+)\/(backend|core|frontend|plugin|contracts)\//;
  const matches = scanText([extensionsRoot], regex, {
    allowedExts: codeFileExts,
    ignorePathIncludes: ['/docs/', '/knowledge/', '/mirror/'],
  });
  return matches.filter((item) => !item.file.startsWith('projects/extensions/plugins/'));
}

function main() {
  const failures = [];

  const pluginPathViolations = checkPluginLoadPaths();
  if (pluginPathViolations.length > 0) {
    failures.push({
      title: 'plugins.load.paths points to plugin subdirectory',
      items: pluginPathViolations,
    });
  }

  const residue5001 = filterNoiseMatches(
    scanText([extensionsRoot], /(^|[^\d])5001([^\d]|$)/, {
      allowedExts: codeFileExts,
    }),
    ['projects/extensions/kernel/testing/boundary-check.mjs']
  );
  if (residue5001.length > 0) {
    failures.push({
      title: 'found 5001 residuals',
      items: residue5001.slice(0, 30).map((m) => `${m.file}:${m.line} ${m.preview}`),
    });
  }

  const workspacePathResidue = filterNoiseMatches(
    scanText([extensionsRoot], /\/workspace\/projects|\\workspace\\projects/i, {
      allowedExts: codeFileExts,
    }),
    [
      'projects/extensions/kernel/testing/boundary-check.mjs',
      'projects/extensions/core/config.ts',
      'projects/extensions/core/config.js',
      'projects/extensions/experience-manager/data/',
    ]
  );
  if (workspacePathResidue.length > 0) {
    failures.push({
      title: 'found /workspace/projects residuals',
      items: workspacePathResidue.slice(0, 30).map((m) => `${m.file}:${m.line} ${m.preview}`),
    });
  }

  const deepImports = checkCrossModuleDeepImports();
  if (deepImports.length > 0) {
    failures.push({
      title: 'found cross-module deep import references',
      items: deepImports.slice(0, 30).map((m) => `${m.file}:${m.line} ${m.preview}`),
    });
  }

  const moduleIssues = checkModuleJsonIntegrity();
  if (moduleIssues.length > 0) {
    failures.push({
      title: 'module.json integrity issues',
      items: moduleIssues.map((m) => `${m.module}: ${m.issue}`),
    });
  }

  const runtimeResidue = checkRuntimeResidue();
  if (runtimeResidue.length > 0) {
    failures.push({
      title: 'runtime directories still exist in source tree',
      items: runtimeResidue,
    });
  }

  const sharedNavIssues = checkSharedNavEntries();
  if (sharedNavIssues.length > 0) {
    failures.push({
      title: 'shared nav still contains legacy entries',
      items: sharedNavIssues,
    });
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`\n[FAIL] ${failure.title}`);
      for (const item of failure.items) {
        console.error(`  - ${item}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log('[OK] boundary checks passed');
}

main();
