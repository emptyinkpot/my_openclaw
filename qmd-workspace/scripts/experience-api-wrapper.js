#!/usr/bin/env node

/**
 * 经验 API 包装器
 * 修复经验管理模块的搜索功能，并提供稳定的 API 接口
 */

const fs = require('fs');
const path = require('path');

// 直接读取经验数据文件
const EXPERIENCE_DATA_PATH = '/workspace/projects/extensions/plugins/experience-manager/data/experiences.json';

/**
 * 读取经验数据
 */
function readExperienceData() {
  try {
    const content = fs.readFileSync(EXPERIENCE_DATA_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('读取经验数据失败:', error.message);
    return { records: [] };
  }
}

/**
 * 搜索经验记录（本地实现，避免 API bug）
 */
function searchExperiencesLocal(query) {
  const data = readExperienceData();
  const records = data.records || [];
  
  if (!query || query.trim() === '') {
    return records;
  }
  
  const queryLower = query.toLowerCase().trim();
  
  return records.filter(record => {
    // 检查标题
    if (record.title && record.title.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    // 检查描述
    if (record.description && record.description.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    // 检查解决方案
    if (record.solution && record.solution.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    // 检查用户查询
    if (record.userQuery && record.userQuery.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    // 检查标签
    if (record.tags && Array.isArray(record.tags)) {
      for (const tag of record.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
    }
    
    // 检查应用的经验
    if (record.experienceApplied && Array.isArray(record.experienceApplied)) {
      for (const exp of record.experienceApplied) {
        if (exp.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
    }
    
    // 检查获得的经验
    if (record.experienceGained && Array.isArray(record.experienceGained)) {
      for (const exp of record.experienceGained) {
        if (exp.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
    }
    
    return false;
  });
}

/**
 * 按标签筛选经验
 */
function filterByTagLocal(tag) {
  const data = readExperienceData();
  const records = data.records || [];
  
  if (!tag || tag.trim() === '') {
    return records;
  }
  
  const tagLower = tag.toLowerCase().trim();
  
  return records.filter(record => {
    if (!record.tags || !Array.isArray(record.tags)) {
      return false;
    }
    
    return record.tags.some(t => t.toLowerCase() === tagLower);
  });
}

/**
 * 获取经验统计
 */
function getStatsLocal() {
  const data = readExperienceData();
  const records = data.records || [];
  
  // 计算统计信息
  const stats = {
    totalRecords: records.length,
    totalXP: records.reduce((sum, record) => sum + (record.xpGained || 0), 0),
    byType: {},
    byDifficulty: {},
    byTag: {},
    recentRecords: records.slice(-10).reverse() // 最近10条
  };
  
  // 按类型统计
  records.forEach(record => {
    const type = record.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });
  
  // 按难度统计
  records.forEach(record => {
    const difficulty = record.difficulty || 0;
    stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;
  });
  
  // 按标签统计
  records.forEach(record => {
    if (record.tags && Array.isArray(record.tags)) {
      record.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
    }
  });
  
  // 计算等级
  const level = Math.floor(stats.totalXP / 1000) + 1;
  const levelTitles = [
    '新手', '学徒', '助手', '专家', '大师', '宗师', '传奇'
  ];
  const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)] || '传奇';
  
  stats.level = level;
  stats.levelTitle = levelTitle;
  
  // 计算平均难度
  if (records.length > 0) {
    const totalDifficulty = records.reduce((sum, record) => sum + (record.difficulty || 0), 0);
    stats.avgDifficulty = totalDifficulty / records.length;
  } else {
    stats.avgDifficulty = 0;
  }
  
  // 月度增长（简化版）
  stats.monthlyGrowth = [
    {
      month: '2026-03',
      xp: stats.totalXP,
      count: records.length
    }
  ];
  
  return stats;
}

/**
 * 启动本地 API 服务器
 */
function startLocalApiServer(port = 3003) {
  const http = require('http');
  
  const server = http.createServer((req, res) => {
    const url = req.url || '';
    const method = req.method || 'GET';
    const path = url.split('?')[0];
    
    // 解析查询参数
    const queryParams = new URLSearchParams(url.split('?')[1] || '');
    const query = queryParams.get('q') || '';
    const tag = queryParams.get('tag') || '';
    
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 处理预检请求
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    try {
      // GET /api/experience/stats
      if (path === '/api/experience/stats' && method === 'GET') {
        const stats = getStatsLocal();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: stats }));
        return;
      }
      
      // GET /api/experience/records
      if (path === '/api/experience/records' && method === 'GET') {
        const data = readExperienceData();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: data.records || [] }));
        return;
      }
      
      // GET /api/experience/search
      if (path === '/api/experience/search' && method === 'GET') {
        const results = searchExperiencesLocal(query);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: results }));
        return;
      }
      
      // GET /api/experience/tag/:tag
      const tagMatch = path.match(/^\/api\/experience\/tag\/(.+)$/);
      if (tagMatch && method === 'GET') {
        const tagName = decodeURIComponent(tagMatch[1]);
        const results = filterByTagLocal(tagName);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: results }));
        return;
      }
      
      // 未找到的路由
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
      
    } catch (error) {
      console.error('API 错误:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
  
  server.listen(port, () => {
    console.log(`经验 API 服务器运行在 http://localhost:${port}`);
    console.log('可用端点:');
    console.log(`  GET /api/experience/stats`);
    console.log(`  GET /api/experience/records`);
    console.log(`  GET /api/experience/search?q=关键词`);
    console.log(`  GET /api/experience/tag/标签名`);
  });
  
  return server;
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'server':
      const port = arg ? parseInt(arg) : 3003;
      startLocalApiServer(port);
      break;
      
    case 'search':
      if (!arg) {
        console.error('请提供搜索关键词');
        process.exit(1);
      }
      const results = searchExperiencesLocal(arg);
      console.log(`找到 ${results.length} 条记录:`);
      results.forEach((record, index) => {
        console.log(`${index + 1}. ${record.title} (${record.type}, 难度: ${record.difficulty}/5)`);
      });
      break;
      
    case 'stats':
      const stats = getStatsLocal();
      console.log('经验统计:');
      console.log(`- 总记录数: ${stats.totalRecords}`);
      console.log(`- 总经验值: ${stats.totalXP}`);
      console.log(`- 等级: ${stats.level} (${stats.levelTitle})`);
      console.log(`- 平均难度: ${stats.avgDifficulty.toFixed(2)}/5`);
      
      console.log('\n按类型分布:');
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} 条`);
      });
      break;
      
    case 'sync-qmd':
      syncToQmd();
      break;
      
    default:
      console.log(`
经验 API 包装器

用法:
  node experience-api-wrapper.js <命令> [参数]

命令:
  server [端口]       启动本地 API 服务器（默认: 3003）
  search <关键词>     搜索经验记录
  stats               显示经验统计
  sync-qmd            同步经验到 QMD

示例:
  node experience-api-wrapper.js server 3003
  node experience-api-wrapper.js search "OpenClaw"
  node experience-api-wrapper.js stats
  node experience-api-wrapper.js sync-qmd
      `);
      break;
  }
}

/**
 * 同步经验到 QMD
 */
function syncToQmd() {
  console.log('同步经验数据到 QMD...');
  
  const data = readExperienceData();
  const records = data.records || [];
  
  // 创建经验目录
  const experienceDir = '/workspace/projects/qmd-workspace/experience';
  if (!fs.existsSync(experienceDir)) {
    fs.mkdirSync(experienceDir, { recursive: true });
  }
  
  // 转换为 Markdown 文件
  let successCount = 0;
  for (const record of records) {
    try {
      const markdown = `# ${record.title}

**ID**: ${record.id}
**类型**: ${record.type}
**难度**: ${record.difficulty}/5
**经验值**: ${record.xpGained}
**日期**: ${new Date(record.timestamp).toISOString().split('T')[0]}

## 问题描述
${record.description || '无描述'}

## 解决方案
${record.solution || '无解决方案'}

## 应用的经验
${(record.experienceApplied || []).length > 0 ? record.experienceApplied.map(exp => `- ${exp}`).join('\n') : '无'}

## 获得的经验
${(record.experienceGained || []).length > 0 ? record.experienceGained.map(exp => `- ${exp}`).join('\n') : '无'}

## 标签
${(record.tags || []).map(tag => `\`${tag}\``).join(' ')}

---
*从经验管理模块同步*
`;
      
      const filename = `experience_${record.id}.md`;
      const filepath = path.join(experienceDir, filename);
      
      fs.writeFileSync(filepath, markdown, 'utf8');
      successCount++;
    } catch (error) {
      console.error(`转换记录失败 (${record.id}):`, error.message);
    }
  }
  
  console.log(`成功转换 ${successCount}/${records.length} 条记录`);
  
  // 创建索引文件
  const indexContent = `# 经验记录索引

共 ${records.length} 条经验记录，最后更新: ${new Date().toISOString()}

## 快速搜索
\`\`\`bash
# 使用 QMD 搜索
npx @tobilu/qmd search "关键词" -c experience --json

# 使用本地 API
curl http://localhost:3003/api/experience/search?q=关键词
\`\`\`

## 按类型浏览
${Object.entries(groupBy(records, 'type')).map(([type, items]) => `
### ${type} (${items.length} 条)
${items.slice(0, 5).map(item => `- [${item.title}](experience_${item.id}.md)`).join('\n')}
${items.length > 5 ? `... 还有 ${items.length - 5} 条` : ''}
`).join('\n')}

## 热门标签
${Object.entries(countTags(records)).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => `- \`${tag}\`: ${count} 次`).join('\n')}
`;
  
  fs.writeFileSync(path.join(experienceDir, 'README.md'), indexContent, 'utf8');
  
  console.log('已创建索引文件');
  console.log(`经验数据已同步到: ${experienceDir}`);
}

/**
 * 按字段分组
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key] || '未知';
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

/**
 * 统计标签使用频率
 */
function countTags(records) {
  const tagCount = {};
  records.forEach(record => {
    (record.tags || []).forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  return tagCount;
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  readExperienceData,
  searchExperiencesLocal,
  filterByTagLocal,
  getStatsLocal,
  startLocalApiServer,
  syncToQmd
};