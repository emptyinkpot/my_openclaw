/**
 * 通用剪贴板模块
 * 
 * 提供跨脚本的持久化数据传递能力
 * 
 * 功能：
 * - 读写文本文件
 * - 读写 JSON 文件
 * - 支持时间戳文件和 latest 文件
 * - 支持多命名空间（不同场景使用不同目录）
 * - 自动清理旧文件，只保留最新 N 组
 * 
 * 使用方式：
 *   const clipboard = require('lib/utils/clipboard');
 *   
 *   // 基础用法
 *   clipboard.write('hello world');
 *   const text = clipboard.read();
 *   
 *   // 使用命名空间
 *   clipboard.write('data', 'file', { namespace: 'polish' });
 *   
 *   // 保存带元数据的结果（自动清理）
 *   clipboard.saveResult(
 *     { title: '...', content: '...' },
 *     { prefix: 'baimeng-作品名-第一章', namespace: 'polish' }
 *   );
 * 
 * @module lib/utils/clipboard
 */

const fs = require('fs');
const path = require('path');

// 全局剪贴板目录（跨项目共享）
const CLIPBOARD_DIR = path.join(
  process.env.COZE_WORKSPACE_PATH || '/workspace/projects',
  'storage/clipboard'
);

// 默认保留数量
const DEFAULT_KEEP_COUNT = 3;

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 获取剪贴板目录
 * @param {string} namespace - 命名空间
 */
function getDir(namespace = '') {
  return namespace ? path.join(CLIPBOARD_DIR, namespace) : CLIPBOARD_DIR;
}

/**
 * 写入文本
 * 
 * @param {string} content - 内容
 * @param {string} name - 文件名
 * @param {object} options - 选项
 * @param {string} options.namespace - 命名空间
 * @param {boolean} options.timestamp - 是否同时保存带时间戳的文件
 * @returns {string|object} 文件路径
 */
function write(content, name = 'latest', options = {}) {
  const { namespace = '', timestamp = false } = options;
  const dir = ensureDir(getDir(namespace));
  
  // 保存主文件
  const filePath = path.join(dir, `${name}.txt`);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  // 同时保存带时间戳的文件
  if (timestamp) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const tsFilePath = path.join(dir, `${name}-${ts}.txt`);
    fs.writeFileSync(tsFilePath, content, 'utf-8');
    return { main: filePath, timestamped: tsFilePath };
  }
  
  return filePath;
}

/**
 * 读取文本
 * 
 * @param {string} name - 文件名
 * @param {object} options - 选项
 * @param {string} options.namespace - 命名空间
 * @returns {string|null} 内容或 null
 */
function read(name = 'latest', options = {}) {
  const { namespace = '' } = options;
  const dir = getDir(namespace);
  const filePath = path.join(dir, `${name}.txt`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 写入 JSON
 */
function writeJson(data, name = 'latest', options = {}) {
  const { namespace = '', timestamp = false } = options;
  const dir = ensureDir(getDir(namespace));
  
  const content = JSON.stringify(data, null, 2);
  const filePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  if (timestamp) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const tsFilePath = path.join(dir, `${name}-${ts}.json`);
    fs.writeFileSync(tsFilePath, content, 'utf-8');
    return { main: filePath, timestamped: tsFilePath };
  }
  
  return filePath;
}

/**
 * 读取 JSON
 */
function readJson(name = 'latest', options = {}) {
  const { namespace = '' } = options;
  const dir = getDir(namespace);
  const filePath = path.join(dir, `${name}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 保存结果（带元数据和自动清理）
 * 
 * @param {object} result - 结果对象 { title, content } 或任意结构
 * @param {object} options - 选项
 * @param {string} options.prefix - 文件名前缀（如 'baimeng-作品名-第一章'）
 * @param {string} options.namespace - 命名空间（如 'polish'）
 * @param {object} options.meta - 元数据（会写入文件头部）
 * @param {number} options.keepCount - 保留数量（默认 3）
 * @returns {object} { path, prefix }
 * 
 * @example
 * clipboard.saveResult(
 *   { title: '第一章', content: '正文内容...' },
 *   { 
 *     prefix: 'baimeng-我的小说-第一章',
 *     namespace: 'polish',
 *     meta: { source: 'baimeng', work: '我的小说', chapter: '第一章' }
 *   }
 * );
 */
function saveResult(result, options = {}) {
  const { 
    prefix = 'result', 
    namespace = '', 
    meta = {},
    keepCount = DEFAULT_KEEP_COUNT 
  } = options;
  
  const dir = ensureDir(getDir(namespace));
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  
  // 生成内容
  let content = '';
  
  // 写入元数据
  if (Object.keys(meta).length > 0) {
    for (const [key, value] of Object.entries(meta)) {
      content += `【${key}】${value}\n`;
    }
    content += '\n';
  }
  
  // 写入结果
  if (result.title !== undefined) {
    content += `【标题】\n${result.title || ''}\n\n`;
  }
  if (result.content !== undefined) {
    content += `【正文】\n${result.content || ''}`;
  } else if (typeof result === 'string') {
    content += result;
  } else {
    content += JSON.stringify(result, null, 2);
  }
  
  // 保存主文件
  const mainPath = path.join(dir, `${prefix}.txt`);
  fs.writeFileSync(mainPath, content, 'utf-8');
  
  // 保存时间戳备份
  const tsPath = path.join(dir, `${prefix}-${ts}.txt`);
  fs.writeFileSync(tsPath, content, 'utf-8');
  
  // 保存 latest 副本
  const latestPath = path.join(dir, 'latest.txt');
  fs.writeFileSync(latestPath, content, 'utf-8');
  
  // 自动清理
  cleanup({ namespace, keepCount });
  
  return { path: mainPath, prefix };
}

/**
 * 清理旧文件，只保留最新 N 组
 * 
 * @param {object} options - 选项
 * @param {string} options.namespace - 命名空间
 * @param {number} options.keepCount - 保留数量（默认 3）
 * @param {boolean} options.dryRun - 预览模式，不实际删除
 * @returns {object} { deleted: number, kept: array }
 */
function cleanup(options = {}) {
  const { namespace = '', keepCount = DEFAULT_KEEP_COUNT, dryRun = false } = options;
  const dir = getDir(namespace);
  
  if (!fs.existsSync(dir)) {
    return { deleted: 0, kept: [] };
  }
  
  const files = fs.readdirSync(dir);
  
  // 过滤出带时间戳的文件
  const timestampedFiles = files.filter(f => 
    f.match(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/)
  );
  
  // 按前缀分组
  const groups = {};
  timestampedFiles.forEach(f => {
    const prefix = f.replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/, '');
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(f);
  });
  
  // 按最新时间戳排序分组
  const sortedGroups = Object.entries(groups)
    .map(([prefix, files]) => {
      const latestFile = files.sort().reverse()[0];
      const timeMatch = latestFile.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
      return {
        prefix,
        files,
        latestTime: timeMatch ? timeMatch[1] : ''
      };
    })
    .sort((a, b) => b.latestTime.localeCompare(a.latestTime));
  
  const toKeep = sortedGroups.slice(0, keepCount);
  const toDelete = sortedGroups.slice(keepCount);
  
  let deletedCount = 0;
  
  for (const group of toDelete) {
    if (!dryRun) {
      // 删除时间戳文件
      for (const f of group.files) {
        try {
          fs.unlinkSync(path.join(dir, f));
          deletedCount++;
        } catch (e) {}
      }
      // 删除主文件
      try {
        fs.unlinkSync(path.join(dir, `${group.prefix}.txt`));
      } catch (e) {}
    }
  }
  
  return {
    deleted: deletedCount,
    kept: toKeep.map(g => g.prefix)
  };
}

/**
 * 列出文件
 */
function list(options = {}) {
  const { namespace = '' } = options;
  const dir = getDir(namespace);
  
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  return fs.readdirSync(dir).map(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    return {
      name: file,
      size: stat.size,
      modified: stat.mtime
    };
  });
}

/**
 * 清空命名空间
 */
function clear(options = {}) {
  const { namespace = '' } = options;
  const dir = getDir(namespace);
  
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      fs.unlinkSync(path.join(dir, f));
    });
  }
}

module.exports = {
  // 基础方法
  write,
  read,
  writeJson,
  readJson,
  
  // 高级方法
  saveResult,
  cleanup,
  list,
  clear,
  
  // 工具方法
  getDir,
  ensureDir,
  
  // 常量
  CLIPBOARD_DIR,
  DEFAULT_KEEP_COUNT
};
