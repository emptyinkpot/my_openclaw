#!/usr/bin/env node

/**
 * QMD 经验集成脚本
 * 让 QMD 能够通过 API 查询经验管理模块的数据
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  gatewayUrl: 'http://localhost:5000',
  gatewayToken: 'e1647cdb-1b80-4eee-a975-7599160cc89b',
  qmdWorkspace: '/workspace/projects/qmd-workspace',
  experienceDir: '/workspace/projects/qmd-workspace/experience'
};

// 确保经验目录存在
if (!fs.existsSync(CONFIG.experienceDir)) {
  fs.mkdirSync(CONFIG.experienceDir, { recursive: true });
}

/**
 * 通过 API 获取经验数据
 */
async function fetchExperienceData(endpoint) {
  const url = `${CONFIG.gatewayUrl}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${CONFIG.gatewayToken}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`获取经验数据失败 (${endpoint}):`, error.message);
    return null;
  }
}

/**
 * 将经验记录转换为 Markdown 文件
 */
function convertExperienceToMarkdown(record) {
  const { id, title, type, description, solution, experienceApplied = [], experienceGained = [], tags = [], difficulty, xpGained, timestamp } = record;
  
  const date = new Date(timestamp).toISOString().split('T')[0];
  
  return `# ${title}

**ID**: ${id}
**类型**: ${type}
**难度**: ${difficulty}/5
**经验值**: ${xpGained}
**日期**: ${date}

## 问题描述
${description || '无描述'}

## 解决方案
${solution || '无解决方案'}

## 应用的经验
${experienceApplied.length > 0 ? experienceApplied.map(exp => `- ${exp}`).join('\n') : '无'}

## 获得的经验
${experienceGained.length > 0 ? experienceGained.map(exp => `- ${exp}`).join('\n') : '无'}

## 标签
${tags.map(tag => `\`${tag}\``).join(' ')}

---
*自动从经验管理模块同步*
`;
}

/**
 * 同步所有经验记录到 QMD
 */
async function syncAllExperiences() {
  console.log('开始同步经验数据...');
  
  // 1. 获取统计信息
  const stats = await fetchExperienceData('/api/experience/stats');
  if (!stats || !stats.success) {
    console.error('无法获取经验统计信息');
    return;
  }
  
  console.log(`找到 ${stats.data.totalRecords} 条经验记录，总经验值: ${stats.data.totalXP}`);
  
  // 2. 获取所有记录
  const recordsResponse = await fetchExperienceData('/api/experience/records');
  if (!recordsResponse || !recordsResponse.success) {
    console.error('无法获取经验记录');
    return;
  }
  
  const records = recordsResponse.data;
  console.log(`成功获取 ${records.length} 条记录`);
  
  // 3. 转换为 Markdown 文件
  let successCount = 0;
  for (const record of records) {
    try {
      const markdown = convertExperienceToMarkdown(record);
      const filename = `experience_${record.id}.md`;
      const filepath = path.join(CONFIG.experienceDir, filename);
      
      fs.writeFileSync(filepath, markdown, 'utf8');
      successCount++;
    } catch (error) {
      console.error(`转换记录失败 (${record.id}):`, error.message);
    }
  }
  
  console.log(`成功转换 ${successCount}/${records.length} 条记录`);
  
  // 4. 创建索引文件
  createIndexFile(records);
  
  // 5. 更新 QMD 索引
  updateQmdIndex();
}

/**
 * 创建索引文件
 */
function createIndexFile(records) {
  const indexContent = `# 经验记录索引

共 ${records.length} 条经验记录，按类型分类：

${Object.entries(groupBy(records, 'type')).map(([type, items]) => `
## ${type} (${items.length} 条)
${items.map(item => `- [${item.title}](experience_${item.id}.md) - 难度: ${item.difficulty}/5, 经验值: ${item.xpGained}`).join('\n')}
`).join('\n')}

## 按标签统计
${Object.entries(countTags(records)).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, count]) => `- \`${tag}\`: ${count} 次`).join('\n')}

---
*最后更新: ${new Date().toISOString()}*
`;

  fs.writeFileSync(path.join(CONFIG.experienceDir, 'INDEX.md'), indexContent, 'utf8');
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

/**
 * 更新 QMD 索引
 */
function updateQmdIndex() {
  try {
    console.log('更新 QMD 索引...');
    
    // 添加经验目录到 QMD 集合
    const collectionCmd = `cd ${CONFIG.qmdWorkspace} && npx @tobilu/qmd collection add ${CONFIG.experienceDir} --name experience`;
    execSync(collectionCmd, { stdio: 'inherit' });
    
    // 生成嵌入向量
    const embedCmd = `cd ${CONFIG.qmdWorkspace} && npx @tobilu/qmd embed --incremental`;
    execSync(embedCmd, { stdio: 'inherit' });
    
    console.log('QMD 索引更新完成');
  } catch (error) {
    console.error('更新 QMD 索引失败:', error.message);
  }
}

/**
 * 搜索经验记录
 */
async function searchExperiences(query) {
  console.log(`搜索经验: "${query}"`);
  
  const searchResult = await fetchExperienceData(`/api/experience/search?q=${encodeURIComponent(query)}`);
  if (!searchResult || !searchResult.success) {
    console.error('搜索失败');
    return [];
  }
  
  const results = searchResult.data;
  console.log(`找到 ${results.length} 条相关记录:`);
  
  results.forEach((record, index) => {
    console.log(`${index + 1}. ${record.title} (${record.type}, 难度: ${record.difficulty}/5)`);
    console.log(`   标签: ${(record.tags || []).join(', ')}`);
    console.log(`   经验值: ${record.xpGained}`);
    console.log();
  });
  
  return results;
}

/**
 * 按标签筛选经验
 */
async function filterByTag(tag) {
  console.log(`按标签筛选: "${tag}"`);
  
  const tagResult = await fetchExperienceData(`/api/experience/tag/${encodeURIComponent(tag)}`);
  if (!tagResult || !tagResult.success) {
    console.error('按标签筛选失败');
    return [];
  }
  
  const results = tagResult.data;
  console.log(`标签 "${tag}" 下有 ${results.length} 条记录:`);
  
  results.forEach((record, index) => {
    console.log(`${index + 1}. ${record.title} (${record.type})`);
  });
  
  return results;
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'sync':
      await syncAllExperiences();
      break;
      
    case 'search':
      if (!arg) {
        console.error('请提供搜索关键词');
        process.exit(1);
      }
      await searchExperiences(arg);
      break;
      
    case 'tag':
      if (!arg) {
        console.error('请提供标签名称');
        process.exit(1);
      }
      await filterByTag(arg);
      break;
      
    case 'stats':
      const stats = await fetchExperienceData('/api/experience/stats');
      if (stats && stats.success) {
        console.log('经验统计:');
        console.log(`- 总记录数: ${stats.data.totalRecords}`);
        console.log(`- 总经验值: ${stats.data.totalXP}`);
        console.log(`- 等级: ${stats.data.level} (${stats.data.levelTitle})`);
        console.log(`- 平均难度: ${stats.data.avgDifficulty.toFixed(2)}/5`);
        
        console.log('\n按类型分布:');
        Object.entries(stats.data.byType).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count} 条`);
        });
      }
      break;
      
    default:
      console.log(`
QMD 经验集成工具

用法:
  node experience-integration.js <命令> [参数]

命令:
  sync             同步所有经验记录到 QMD
  search <关键词>  搜索经验记录
  tag <标签名>     按标签筛选经验
  stats            显示经验统计信息

示例:
  node experience-integration.js sync
  node experience-integration.js search "OpenClaw"
  node experience-integration.js tag "前端"
  node experience-integration.js stats
      `);
      break;
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fetchExperienceData,
  syncAllExperiences,
  searchExperiences,
  filterByTag
};