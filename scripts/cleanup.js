#!/usr/bin/env node
/**
 * 项目清理脚本 - 自动清理垃圾文件和图片残余
 * 
 * 功能：
 * - 清理旧截图（保留最近 N 个）
 * - 清理临时文件
 * - 清理备份文件（保留最近 N 天）
 * - 清理空目录
 * - 压缩旧日志
 * - 生成清理报告
 * 
 * 用法：
 *   node cleanup.js [选项]
 * 
 * 选项：
 *   --dry-run      预览模式，不实际删除
 *   --screenshots  仅清理截图
 *   --logs         仅清理日志
 *   --all          执行全部清理
 *   --help         显示帮助
 * 
 * 定时任务设置：
 *   # 每天凌晨 2 点执行
 *   0 2 * * * cd /workspace/projects && node scripts/cleanup.js --all
 * 
 * @author OpenClaw
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const rename = promisify(fs.rename);

// ==================== 配置 ====================

const CONFIG = {
  // 项目根目录
  rootDir: '/workspace/projects',
  
  // 截图配置
  screenshots: {
    enabled: true,
    // 保留每个子目录最近的 N 个截图
    keepCount: 5,
    // 超过 N 天的截图删除
    maxAgeDays: 7,
    // 截图目录
    dirs: [
      'output/screenshots/baimeng'
    ]
  },
  
  // 临时文件配置
  tempFiles: {
    enabled: true,
    // 文件模式
    patterns: [
      '*.tmp',
      '*.temp',
      '*~',
      '.DS_Store',
      'Thumbs.db',
      '*.swp',
      '*.swo',
      '.vscode/tags'
    ],
    // 排除目录
    excludeDirs: [
      'node_modules',
      '.git',
      'browser/openclaw/user-data'  // 浏览器数据不能删
    ]
  },
  
  // 备份文件配置
  backups: {
    enabled: true,
    // 保留最近 N 天的备份
    keepDays: 7,
    // 文件模式
    patterns: [
      '*.bak',
      '*.backup',
      '*.old',
      '*.orig'
    ]
  },
  
  // 日志文件配置
  logs: {
    enabled: true,
    // 超过 N 天的日志压缩
    compressAfterDays: 3,
    // 超过 N 天的压缩日志删除
    deleteCompressedAfterDays: 30,
    // 日志目录
    dirs: [
      'output',
      'cron'
    ],
    // 日志文件模式
    patterns: [
      '*.log'
    ]
  },
  
  // 空目录清理
  emptyDirs: {
    enabled: true,
    // 排除目录
    excludeDirs: [
      'node_modules',
      '.git',
      'output',
      'browser'
    ]
  },
  
  // 大文件检测（可选）
  largeFiles: {
    enabled: false,
    // 超过 N MB 视为大文件
    thresholdMB: 50,
    // 仅报告，不删除
    dryRun: true
  }
};

// ==================== 工具函数 ====================

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 获取文件年龄（天）
 */
function getFileAgeDays(stats) {
  const now = Date.now();
  const mtime = stats.mtime.getTime();
  return Math.floor((now - mtime) / (1000 * 60 * 60 * 24));
}

/**
 * 匹配文件模式
 */
function matchPatterns(filename, patterns) {
  return patterns.some(pattern => {
    // 支持简单的通配符
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(filename);
  });
}

/**
 * 递归遍历目录
 */
async function walkDir(dir, callback, excludeDirs = []) {
  let items;
  try {
    items = await readdir(dir);
  } catch (error) {
    // 目录无法读取（可能是权限或已删除），跳过
    return;
  }
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    let stats;
    
    try {
      stats = await stat(fullPath);
    } catch (error) {
      // 文件可能已被删除，跳过
      continue;
    }
    
    if (stats.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        await walkDir(fullPath, callback, excludeDirs);
      }
    } else {
      try {
        await callback(fullPath, item, stats);
      } catch (error) {
        // 单个文件处理错误，继续
        console.log(`  ⚠️  跳过: ${fullPath} (${error.message})`);
      }
    }
  }
}

/**
 * 安全删除文件
 */
async function safeDelete(filePath, dryRun = false) {
  if (dryRun) {
    return { deleted: false, dryRun: true };
  }
  
  try {
    await unlink(filePath);
    return { deleted: true, error: null };
  } catch (error) {
    return { deleted: false, error: error.message };
  }
}

/**
 * 压缩文件（gzip）
 */
async function compressFile(filePath) {
  const zlib = require('zlib');
  const pipeline = promisify(require('stream').pipeline);
  const createReadStream = fs.createReadStream;
  const createWriteStream = fs.createWriteStream;
  
  const gzip = zlib.createGzip();
  const source = createReadStream(filePath);
  const destination = createWriteStream(filePath + '.gz');
  
  await pipeline(source, gzip, destination);
  await unlink(filePath);
  
  return filePath + '.gz';
}

// ==================== 清理模块 ====================

/**
 * 清理旧截图
 */
async function cleanupScreenshots(dryRun = false) {
  console.log('\n📸 清理旧截图...');
  const result = {
    type: 'screenshots',
    scanned: 0,
    deleted: 0,
    errors: [],
    freed: 0
  };
  
  for (const dir of CONFIG.screenshots.dirs) {
    const fullDir = path.join(CONFIG.rootDir, dir);
    
    if (!fs.existsSync(fullDir)) {
      continue;
    }
    
    // 读取所有截图文件
    const files = await readdir(fullDir);
    const imageFiles = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map(f => ({
        name: f,
        path: path.join(fullDir, f),
        stats: fs.statSync(path.join(fullDir, f))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime); // 最新的在前
    
    result.scanned += imageFiles.length;
    
    // 保留最近的 N 个
    const toDelete = imageFiles.slice(CONFIG.screenshots.keepCount);
    
    // 同时删除超过最大年龄的
    const maxAge = CONFIG.screenshots.maxAgeDays;
    const oldFiles = imageFiles.filter(f => getFileAgeDays(f.stats) > maxAge);
    
    // 合并待删除列表（去重）
    const deleteMap = new Map();
    [...toDelete, ...oldFiles].forEach(f => deleteMap.set(f.path, f));
    
    for (const file of deleteMap.values()) {
      const age = getFileAgeDays(file.stats);
      console.log(`  🗑️  ${file.name} (${formatSize(file.stats.size)}, ${age}天前)`);
      
      const deleteResult = await safeDelete(file.path, dryRun);
      
      if (deleteResult.deleted || deleteResult.dryRun) {
        result.deleted++;
        result.freed += file.stats.size;
      } else {
        result.errors.push({ file: file.path, error: deleteResult.error });
      }
    }
  }
  
  console.log(`  ✅ 删除: ${result.deleted} 个, 释放: ${formatSize(result.freed)}`);
  return result;
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles(dryRun = false) {
  console.log('\n🧹 清理临时文件...');
  const result = {
    type: 'tempFiles',
    scanned: 0,
    deleted: 0,
    errors: [],
    freed: 0
  };
  
  await walkDir(
    CONFIG.rootDir,
    async (fullPath, filename, stats) => {
      if (matchPatterns(filename, CONFIG.tempFiles.patterns)) {
        result.scanned++;
        console.log(`  🗑️  ${path.relative(CONFIG.rootDir, fullPath)}`);
        
        const deleteResult = await safeDelete(fullPath, dryRun);
        
        if (deleteResult.deleted || deleteResult.dryRun) {
          result.deleted++;
          result.freed += stats.size;
        } else {
          result.errors.push({ file: fullPath, error: deleteResult.error });
        }
      }
    },
    CONFIG.tempFiles.excludeDirs
  );
  
  console.log(`  ✅ 删除: ${result.deleted} 个, 释放: ${formatSize(result.freed)}`);
  return result;
}

/**
 * 清理备份文件
 */
async function cleanupBackups(dryRun = false) {
  console.log('\n💾 清理备份文件...');
  const result = {
    type: 'backups',
    scanned: 0,
    deleted: 0,
    errors: [],
    freed: 0
  };
  
  await walkDir(
    CONFIG.rootDir,
    async (fullPath, filename, stats) => {
      if (matchPatterns(filename, CONFIG.backups.patterns)) {
        result.scanned++;
        
        const age = getFileAgeDays(stats);
        if (age > CONFIG.backups.keepDays) {
          console.log(`  🗑️  ${path.relative(CONFIG.rootDir, fullPath)} (${age}天前)`);
          
          const deleteResult = await safeDelete(fullPath, dryRun);
          
          if (deleteResult.deleted || deleteResult.dryRun) {
            result.deleted++;
            result.freed += stats.size;
          } else {
            result.errors.push({ file: fullPath, error: deleteResult.error });
          }
        }
      }
    },
    ['node_modules', '.git', 'browser']
  );
  
  console.log(`  ✅ 删除: ${result.deleted} 个, 释放: ${formatSize(result.freed)}`);
  return result;
}

/**
 * 清理日志文件
 */
async function cleanupLogs(dryRun = false) {
  console.log('\n📜 处理日志文件...');
  const result = {
    type: 'logs',
    scanned: 0,
    compressed: 0,
    deleted: 0,
    errors: [],
    freed: 0
  };
  
  for (const dir of CONFIG.logs.dirs) {
    const fullDir = path.join(CONFIG.rootDir, dir);
    
    if (!fs.existsSync(fullDir)) {
      continue;
    }
    
    const files = await readdir(fullDir);
    
    for (const file of files) {
      if (matchPatterns(file, CONFIG.logs.patterns)) {
        const fullPath = path.join(fullDir, file);
        const stats = await stat(fullPath);
        
        result.scanned++;
        const age = getFileAgeDays(stats);
        
        // 压缩旧日志
        if (age > CONFIG.logs.compressAfterDays && !file.endsWith('.gz')) {
          console.log(`  🗜️  压缩: ${file} (${age}天前)`);
          
          if (!dryRun) {
            try {
              await compressFile(fullPath);
              result.compressed++;
            } catch (error) {
              result.errors.push({ file: fullPath, error: error.message });
            }
          } else {
            result.compressed++;
          }
        }
        
        // 删除过期的压缩日志
        if (file.endsWith('.gz') && age > CONFIG.logs.deleteCompressedAfterDays) {
          console.log(`  🗑️  删除旧日志: ${file} (${age}天前)`);
          
          const deleteResult = await safeDelete(fullPath, dryRun);
          
          if (deleteResult.deleted || deleteResult.dryRun) {
            result.deleted++;
            result.freed += stats.size;
          }
        }
      }
    }
  }
  
  console.log(`  ✅ 压缩: ${result.compressed} 个, 删除: ${result.deleted} 个`);
  return result;
}

/**
 * 清理空目录
 */
async function cleanupEmptyDirs(dryRun = false) {
  console.log('\n📁 清理空目录...');
  const result = {
    type: 'emptyDirs',
    scanned: 0,
    deleted: 0,
    errors: []
  };
  
  async function removeEmptyDirs(dir) {
    const items = await readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory() && !CONFIG.emptyDirs.excludeDirs.includes(item)) {
        await removeEmptyDirs(fullPath);
      }
    }
    
    // 再次读取，看是否为空
    const remaining = await readdir(dir);
    if (remaining.length === 0) {
      result.scanned++;
      const relPath = path.relative(CONFIG.rootDir, dir);
      
      if (relPath !== '') {
        console.log(`  🗑️  ${relPath}/`);
        
        if (!dryRun) {
          try {
            await rmdir(dir);
            result.deleted++;
          } catch (error) {
            result.errors.push({ dir, error: error.message });
          }
        } else {
          result.deleted++;
        }
      }
    }
  }
  
  await removeEmptyDirs(CONFIG.rootDir);
  
  console.log(`  ✅ 删除: ${result.deleted} 个空目录`);
  return result;
}

// ==================== 报告生成 ====================

/**
 * 生成清理报告
 */
function generateReport(results, dryRun = false) {
  const now = new Date();
  const totalFreed = results.reduce((sum, r) => sum + (r.freed || 0), 0);
  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
  
  const report = {
    timestamp: now.toISOString(),
    dryRun: dryRun,
    summary: {
      totalScanned: results.reduce((sum, r) => sum + r.scanned, 0),
      totalDeleted: totalDeleted,
      totalFreed: totalFreed,
      totalFreedFormatted: formatSize(totalFreed)
    },
    details: results
  };
  
  // 保存报告
  const reportDir = path.join(CONFIG.rootDir, 'output', 'cleanup-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `cleanup-report-${formatDate(now)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

/**
 * 打印摘要
 */
function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 清理报告摘要');
  console.log('='.repeat(60));
  
  if (report.dryRun) {
    console.log('⚠️  预览模式 - 未实际删除任何文件');
  }
  
  console.log(`📅 时间: ${report.timestamp}`);
  console.log(`🔍 扫描: ${report.summary.totalScanned} 个项目`);
  console.log(`🗑️  删除: ${report.summary.totalDeleted} 个项目`);
  console.log(`💾 释放: ${report.summary.totalFreedFormatted}`);
  
  console.log('\n📈 详细统计:');
  for (const detail of report.details) {
    console.log(`  ${detail.type}: ${detail.deleted} 个删除${detail.freed ? `, ${formatSize(detail.freed)}` : ''}`);
  }
  
  console.log('\n📝 报告已保存:');
  console.log(`  ${path.join(CONFIG.rootDir, 'output', 'cleanup-reports')}`);
  console.log('='.repeat(60));
}

// ==================== 主函数 ====================

function showHelp() {
  console.log(`
项目清理脚本 - 自动清理垃圾文件和图片残余

用法:
  node cleanup.js [选项]

选项:
  --dry-run          预览模式，不实际删除
  --screenshots      仅清理截图
  --logs             仅清理日志
  --temp             仅清理临时文件
  --backups          仅清理备份文件
  --empty-dirs       仅清理空目录
  --all              执行全部清理（默认）
  --help             显示帮助

示例:
  # 预览模式（查看会删除什么）
  node cleanup.js --dry-run

  # 仅清理截图
  node cleanup.js --screenshots

  # 执行全部清理
  node cleanup.js --all

配置:
  编辑脚本开头的 CONFIG 对象可自定义清理规则
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  const options = {
    dryRun: args.includes('--dry-run'),
    screenshots: args.includes('--screenshots') || args.includes('--all'),
    logs: args.includes('--logs') || args.includes('--all'),
    temp: args.includes('--temp') || args.includes('--all'),
    backups: args.includes('--backups') || args.includes('--all'),
    emptyDirs: args.includes('--empty-dirs') || args.includes('--all'),
    help: args.includes('--help')
  };
  
  // 如果没有指定任何类型，默认执行全部
  if (!options.screenshots && !options.logs && !options.temp && 
      !options.backups && !options.emptyDirs && !options.help) {
    options.screenshots = true;
    options.logs = true;
    options.temp = true;
    options.backups = true;
    options.emptyDirs = true;
  }
  
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('='.repeat(60));
  console.log('🧹 项目清理工具');
  console.log('='.repeat(60));
  console.log(`📂 项目目录: ${CONFIG.rootDir}`);
  console.log(`🕐 执行时间: ${new Date().toLocaleString()}`);
  
  if (options.dryRun) {
    console.log('⚠️  预览模式 - 不会实际删除文件');
  }
  
  const results = [];
  
  try {
    // 执行清理任务
    if (options.screenshots && CONFIG.screenshots.enabled) {
      results.push(await cleanupScreenshots(options.dryRun));
    }
    
    if (options.temp && CONFIG.tempFiles.enabled) {
      results.push(await cleanupTempFiles(options.dryRun));
    }
    
    if (options.backups && CONFIG.backups.enabled) {
      results.push(await cleanupBackups(options.dryRun));
    }
    
    if (options.logs && CONFIG.logs.enabled) {
      results.push(await cleanupLogs(options.dryRun));
    }
    
    if (options.emptyDirs && CONFIG.emptyDirs.enabled) {
      results.push(await cleanupEmptyDirs(options.dryRun));
    }
    
    // 生成报告
    const report = generateReport(results, options.dryRun);
    printSummary(report);
    
    console.log('\n✅ 清理完成!');
    
  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 执行
main();
