#!/usr/bin/env node

/**
 * 同步经验数据到 QMD
 */

const fs = require('fs');
const path = require('path');

// 直接读取经验数据文件
const EXPERIENCE_DATA_PATH = '/workspace/projects/extensions/plugins/experience-manager/data/experiences.json';
const EXPERIENCE_DIR = '/workspace/projects/qmd-workspace/experience';

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
 * 同步经验数据
 */
function syncExperienceToQmd() {
  console.log('同步经验数据到 QMD...');
  
  // 确保目录存在
  if (!fs.existsSync(EXPERIENCE_DIR)) {
    fs.mkdirSync(EXPERIENCE_DIR, { recursive: true });
  }
  
  // 读取数据
  const data = readExperienceData();
  const records = data.records || [];
  
  console.log(`找到 ${records.length} 条经验记录`);
  
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
      const filepath = path.join(EXPERIENCE_DIR, filename);
      
      fs.writeFileSync(filepath, markdown, 'utf8');
      successCount++;
    } catch (error) {
      console.error(`转换记录失败 (${record.id}):`, error.message);
    }
  }
  
  console.log(`成功转换 ${successCount}/${records.length} 条记录`);
  
  // 创建索引文件
  createIndexFile(records);
  
  console.log(`经验数据已同步到: ${EXPERIENCE_DIR}`);
}

/**
 * 创建索引文件
 */
function createIndexFile(records) {
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
  
  fs.writeFileSync(path.join(EXPERIENCE_DIR, 'README.md'), indexContent, 'utf8');
  console.log('已创建索引文件');
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

// 运行同步
syncExperienceToQmd();