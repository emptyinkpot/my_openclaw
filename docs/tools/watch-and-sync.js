#!/usr/bin/env node
/**
 * 代码变更监控脚本
 * 
 * 功能：
 * - 监控代码文件变化
 * - 自动更新相关文档
 * 
 * 用法：
 *   node watch-and-sync.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = '/workspace/projects';
const DOCS_DIR = '/workspace/projects/docs';

// 监控配置
const WATCH_CONFIG = {
  // 技能目录
  'workspace/skills': {
    type: 'skill',
    docPath: '02-scripts/INDEX.md',
    action: 'updateScriptsDoc'
  },
  // 脚本目录
  'scripts': {
    type: 'script',
    docPath: '02-scripts/INDEX.md',
    action: 'updateScriptsDoc'
  },
  // 主配置
  'openclaw.json': {
    type: 'config',
    docPath: '01-project/README.md',
    action: 'updateProjectDoc'
  }
};

/**
 * 获取文件 MD5
 */
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return require('crypto').createHash('md5').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

/**
 * 扫描文件状态
 */
function scanFiles(dir, baseDir = '') {
  const results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!item.includes('node_modules') && 
          !item.includes('.git') && 
          !item.includes('docs')) {
        results.push(...scanFiles(fullPath, relativePath));
      }
    } else if (stat.isFile() && 
               (item.endsWith('.js') || item.endsWith('.json') || item.endsWith('.ts'))) {
      results.push({
        path: relativePath,
        fullPath: fullPath,
        mtime: stat.mtime,
        hash: getFileHash(fullPath)
      });
    }
  }
  
  return results;
}

/**
 * 检查变更
 */
function detectChanges() {
  const stateFile = path.join(DOCS_DIR, '.watch-state.json');
  
  // 读取上次状态
  let lastState = {};
  if (fs.existsSync(stateFile)) {
    try {
      lastState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch (e) {
      console.log('⚠️  读取状态文件失败，将重新扫描');
    }
  }
  
  // 扫描当前状态
  const currentFiles = scanFiles(PROJECT_ROOT);
  const currentState = {};
  const changes = [];
  
  for (const file of currentFiles) {
    currentState[file.path] = file;
    
    const last = lastState[file.path];
    if (!last) {
      changes.push({ type: 'added', file: file.path });
    } else if (last.hash !== file.hash) {
      changes.push({ type: 'modified', file: file.path });
    }
  }
  
  // 检查删除的文件
  for (const path in lastState) {
    if (!currentState[path]) {
      changes.push({ type: 'deleted', file: path });
    }
  }
  
  // 保存当前状态
  fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
  
  return changes;
}

/**
 * 更新文档
 */
function updateDocs(changes) {
  if (changes.length === 0) {
    console.log('📭 无变更');
    return;
  }
  
  console.log(`\n📊 检测到 ${changes.length} 个变更:\n`);
  
  for (const change of changes) {
    const icon = change.type === 'added' ? '➕' : 
                 change.type === 'modified' ? '✏️' : '🗑️';
    console.log(`${icon} ${change.type}: ${change.file}`);
  }
  
  // 触发文档生成
  console.log('\n🔄 更新文档...');
  try {
    execSync('node generate-docs.js', {
      cwd: path.join(DOCS_DIR, 'tools'),
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('⚠️  文档生成失败:', e.message);
  }
}

// 主函数
function main() {
  console.log('🔍 检查代码变更...\n');
  
  const changes = detectChanges();
  updateDocs(changes);
  
  if (changes.length > 0) {
    console.log('\n✅ 文档已同步');
    console.log(`📁 查看文档: ${DOCS_DIR}`);
  }
}

main();
