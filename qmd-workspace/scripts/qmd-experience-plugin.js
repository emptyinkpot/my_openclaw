#!/usr/bin/env node

/**
 * QMD 经验搜索插件
 * 为 QMD 添加直接搜索经验 API 的能力
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  gatewayUrl: 'http://localhost:5000',
  gatewayToken: 'e1647cdb-1b80-4eee-a975-7599160cc89b',
  cacheDir: '/tmp/qmd-experience-cache',
  cacheTTL: 3600000 // 1小时
};

// 确保缓存目录存在
if (!fs.existsSync(CONFIG.cacheDir)) {
  fs.mkdirSync(CONFIG.cacheDir, { recursive: true });
}

/**
 * 获取缓存数据
 */
function getCache(key) {
  const cacheFile = path.join(CONFIG.cacheDir, `${key}.json`);
  
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - data.timestamp < CONFIG.cacheTTL) {
        return data.value;
      }
    } catch (error) {
      // 缓存损坏，忽略
    }
  }
  return null;
}

/**
 * 设置缓存数据
 */
function setCache(key, value) {
  const cacheFile = path.join(CONFIG.cacheDir, `${key}.json`);
  const cacheData = {
    timestamp: Date.now(),
    value: value
  };
  fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
}

/**
 * 调用经验 API
 */
async function callExperienceApi(endpoint) {
  const cacheKey = `api_${endpoint.replace(/\//g, '_')}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }
  
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
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`调用经验 API 失败 (${endpoint}):`, error.message);
    return null;
  }
}

/**
 * 搜索经验记录
 */
async function searchExperience(query, options = {}) {
  const { limit = 10, minScore = 0.3 } = options;
  
  console.log(`[QMD经验搜索] 搜索: "${query}"`);
  
  // 1. 先尝试 API 搜索
  const apiResult = await callExperienceApi(`/api/experience/search?q=${encodeURIComponent(query)}`);
  if (apiResult && apiResult.success) {
    const records = apiResult.data;
    
    // 转换为 QMD 格式
    const qmdResults = records.slice(0, limit).map(record => ({
      file: `experience://${record.id}`,
      score: calculateRelevanceScore(record, query),
      content: formatExperienceContent(record),
      metadata: {
        title: record.title,
        type: record.type,
        difficulty: record.difficulty,
        xp: record.xpGained,
        tags: record.tags || [],
        timestamp: record.timestamp
      }
    }));
    
    // 按分数排序
    qmdResults.sort((a, b) => b.score - a.score);
    
    // 过滤低分结果
    const filteredResults = qmdResults.filter(r => r.score >= minScore);
    
    console.log(`[QMD经验搜索] 找到 ${filteredResults.length} 条相关记录`);
    return filteredResults;
  }
  
  return [];
}

/**
 * 计算相关性分数
 */
function calculateRelevanceScore(record, query) {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  // 标题匹配
  if (record.title.toLowerCase().includes(queryLower)) {
    score += 0.5;
  }
  
  // 描述匹配
  if (record.description && record.description.toLowerCase().includes(queryLower)) {
    score += 0.3;
  }
  
  // 解决方案匹配
  if (record.solution && record.solution.toLowerCase().includes(queryLower)) {
    score += 0.2;
  }
  
  // 标签匹配
  if (record.tags) {
    const tagMatches = record.tags.filter(tag => 
      tag.toLowerCase().includes(queryLower)
    ).length;
    score += tagMatches * 0.1;
  }
  
  // 难度权重（难度越高可能越有价值）
  score += record.difficulty * 0.05;
  
  return Math.min(score, 1.0);
}

/**
 * 格式化经验内容
 */
function formatExperienceContent(record) {
  return `${record.title}

类型: ${record.type}
难度: ${record.difficulty}/5
经验值: ${record.xpGained}

${record.description || ''}

${record.solution || ''}

标签: ${(record.tags || []).join(', ')}
`;
}

/**
 * 获取经验详情
 */
async function getExperienceDetail(experienceId) {
  console.log(`[QMD经验详情] 获取: ${experienceId}`);
  
  const apiResult = await callExperienceApi(`/api/experience/records/${experienceId}`);
  if (apiResult && apiResult.success) {
    return {
      success: true,
      data: apiResult.data
    };
  }
  
  return {
    success: false,
    error: '经验记录不存在'
  };
}

/**
 * 获取热门标签
 */
async function getPopularTags(limit = 20) {
  const stats = await callExperienceData('/api/experience/stats');
  if (stats && stats.success && stats.data.byTag) {
    const tags = Object.entries(stats.data.byTag)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
    
    return tags;
  }
  
  return [];
}

/**
 * 批量获取经验数据（用于 QMD 索引）
 */
async function batchGetExperiences(ids) {
  console.log(`[QMD批量获取] 获取 ${ids.length} 条经验记录`);
  
  const results = [];
  for (const id of ids) {
    const detail = await getExperienceDetail(id);
    if (detail.success) {
      results.push({
        id: detail.data.id,
        content: formatExperienceContent(detail.data),
        metadata: {
          title: detail.data.title,
          type: detail.data.type,
          difficulty: detail.data.difficulty,
          xp: detail.data.xpGained,
          tags: detail.data.tags || [],
          timestamp: detail.data.timestamp
        }
      });
    }
  }
  
  return results;
}

/**
 * 创建 QMD 搜索命令
 */
function createQmdSearchCommand(query, options = {}) {
  const { collection = 'experience', limit = 10 } = options;
  
  return `npx @tobilu/qmd search "${query}" -c ${collection} --json -n ${limit}`;
}

/**
 * 集成到 QMD 工作流
 */
async function integrateWithQmdWorkflow() {
  console.log('[QMD集成] 初始化经验搜索集成...');
  
  // 1. 创建经验集合目录
  const experienceDir = '/workspace/projects/qmd-workspace/experience';
  if (!fs.existsSync(experienceDir)) {
    fs.mkdirSync(experienceDir, { recursive: true });
  }
  
  // 2. 创建 README
  const readmeContent = `# 经验搜索集成

此目录包含从经验管理模块同步的经验记录。

## 使用方法

### 通过 QMD 搜索
\`\`\`bash
# 搜索经验记录
npx @tobilu/qmd search "OpenClaw" -c experience --json

# 高级查询
npx @tobilu/qmd query "前端开发" --json --all --files --min-score 0.4
\`\`\`

### 通过脚本搜索
\`\`\`bash
# 使用经验搜索插件
node scripts/qmd-experience-plugin.js search "问题排查"

# 按标签筛选
node scripts/qmd-experience-plugin.js tag "前端"
\`\`\`

## 数据来源
- 经验管理模块: http://localhost:5000/api/experience
- 总记录数: 106 条
- 最后同步: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(path.join(experienceDir, 'README.md'), readmeContent, 'utf8');
  
  // 3. 同步最新经验记录
  const stats = await callExperienceApi('/api/experience/stats');
  if (stats && stats.success) {
    const recentRecords = stats.data.recentRecords || [];
    
    console.log(`[QMD集成] 同步 ${recentRecords.length} 条最新记录`);
    
    for (const record of recentRecords.slice(0, 20)) {
      const content = formatExperienceContent(record);
      const filename = `experience_${record.id}.md`;
      const filepath = path.join(experienceDir, filename);
      
      fs.writeFileSync(filepath, content, 'utf8');
    }
  }
  
  // 4. 添加到 QMD 集合
  try {
    console.log('[QMD集成] 添加到 QMD 集合...');
    const addCmd = `cd /workspace/projects/qmd-workspace && npx @tobilu/qmd collection add ${experienceDir} --name experience`;
    execSync(addCmd, { stdio: 'pipe' });
    
    // 5. 生成嵌入向量
    console.log('[QMD集成] 生成嵌入向量...');
    const embedCmd = `cd /workspace/projects/qmd-workspace && npx @tobilu/qmd embed --incremental`;
    execSync(embedCmd, { stdio: 'pipe' });
    
    console.log('[QMD集成] 集成完成！');
  } catch (error) {
    console.error('[QMD集成] 集成失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'search':
      if (!arg) {
        console.error('请提供搜索关键词');
        process.exit(1);
      }
      const results = await searchExperience(arg);
      console.log(JSON.stringify(results, null, 2));
      break;
      
    case 'detail':
      if (!arg) {
        console.error('请提供经验ID');
        process.exit(1);
      }
      const detail = await getExperienceDetail(arg);
      console.log(JSON.stringify(detail, null, 2));
      break;
      
    case 'tags':
      const tags = await getPopularTags();
      console.log('热门标签:');
      tags.forEach(({ tag, count }, index) => {
        console.log(`${index + 1}. ${tag}: ${count} 次`);
      });
      break;
      
    case 'integrate':
      await integrateWithQmdWorkflow();
      break;
      
    case 'batch':
      if (!arg) {
        console.error('请提供经验ID列表（逗号分隔）');
        process.exit(1);
      }
      const ids = arg.split(',');
      const batchResults = await batchGetExperiences(ids);
      console.log(JSON.stringify(batchResults, null, 2));
      break;
      
    default:
      console.log(`
QMD 经验搜索插件

用法:
  node qmd-experience-plugin.js <命令> [参数]

命令:
  search <关键词>     搜索经验记录
  detail <经验ID>     获取经验详情
  tags                显示热门标签
  integrate           集成到 QMD 工作流
  batch <ID列表>      批量获取经验记录

示例:
  node qmd-experience-plugin.js search "OpenClaw"
  node qmd-experience-plugin.js detail exp_1774149411555_bbpdasy97
  node qmd-experience-plugin.js tags
  node qmd-experience-plugin.js integrate
  node qmd-experience-plugin.js batch "exp1,exp2,exp3"
      `);
      break;
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  searchExperience,
  getExperienceDetail,
  getPopularTags,
  batchGetExperiences,
  integrateWithQmdWorkflow
};