/**
 * 测试 memory-lancedb-pro 与 experience-manager 联动
 */

import * as fs from 'fs';
import * as path from 'path';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:5000';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'e1647cdb-1b80-4eee-a975-7599160cc89b';
const EXPERIENCE_DATA_PATH = '/workspace/projects/data/experiences.json';

async function testMemoryStore() {
  console.log('\n=== 测试 memory_store ===');
  
  const testMemory = `【测试记忆】MySQL 连接超时问题解决
类型: bug_fix
难度: ⭐⭐⭐ (3/5)

问题描述:
MySQL 连接在长时间空闲后出现超时错误: "Connection timed out"

解决方案:
1. 增加 MySQL wait_timeout 参数到 28800
2. 配置连接池保活机制
3. 添加连接重试逻辑

获得的经验:
- 数据库连接池配置
- MySQL 参数调优
- 错误处理最佳实践`;

  try {
    const response = await fetch(`${GATEWAY_URL}/api/agent/default/tool/memory_store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        parameters: {
          text: testMemory,
          importance: 0.8,
          category: 'fact',
          scope: 'experience',
        },
      }),
    });

    console.log('Status:', response.status);
    const result = await response.text();
    console.log('Result:', result.substring(0, 500));
    
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function testMemoryRecall() {
  console.log('\n=== 测试 memory_recall ===');
  
  try {
    const response = await fetch(`${GATEWAY_URL}/api/agent/default/tool/memory_recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        parameters: {
          query: '数据库连接问题怎么解决',
          limit: 5,
          scope: 'experience',
        },
      }),
    });

    console.log('Status:', response.status);
    const result = await response.text();
    console.log('Result:', result.substring(0, 800));
    
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function testExperienceSync() {
  console.log('\n=== 测试经验同步 ===');
  
  // 创建测试经验
  const testExperience = {
    id: `exp_test_${Date.now()}`,
    timestamp: Date.now(),
    type: 'bug_fix' as const,
    title: 'MySQL 连接超时问题解决',
    description: 'MySQL 连接在长时间空闲后出现超时错误',
    userQuery: '数据库连接超时怎么办？',
    solution: '增加 wait_timeout 参数，配置连接池保活',
    experienceApplied: ['数据库配置'],
    experienceGained: ['MySQL调优', '连接池管理'],
    tags: ['mysql', 'timeout', 'connection'],
    difficulty: 3 as const,
    xpGained: 100,
  };

  // 写入经验数据文件
  const data = JSON.parse(fs.readFileSync(EXPERIENCE_DATA_PATH, 'utf-8'));
  data.records.unshift(testExperience);
  fs.writeFileSync(EXPERIENCE_DATA_PATH, JSON.stringify(data, null, 2));
  console.log('✅ 写入经验到 experiences.json:', testExperience.title);

  // 尝试同步到 memory-lancedb-pro
  const memoryText = `【经验记录】${testExperience.title}

类型: ${testExperience.type}
难度: ${'⭐'.repeat(testExperience.difficulty)} (${testExperience.difficulty}/5)
标签: ${testExperience.tags.join(', ')}

问题描述:
${testExperience.userQuery}

解决方案:
${testExperience.solution}

获得的经验:
${testExperience.experienceGained.map(e => `- ${e}`).join('\n')}`;

  try {
    const response = await fetch(`${GATEWAY_URL}/api/agent/default/tool/memory_store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        parameters: {
          text: memoryText,
          importance: 0.5 + (testExperience.difficulty * 0.1),
          category: 'fact',
          scope: 'experience',
        },
      }),
    });

    if (response.ok) {
      console.log('✅ 同步到 memory-lancedb-pro 成功');
      return true;
    } else {
      console.log('❌ 同步失败:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ 同步异常:', error);
    return false;
  }
}

async function checkMemoryStats() {
  console.log('\n=== 检查 memory-lancedb-pro 统计 ===');
  
  try {
    const response = await fetch(`${GATEWAY_URL}/api/agent/default/tool/memory_stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ parameters: {} }),
    });

    console.log('Status:', response.status);
    const result = await response.text();
    console.log('Stats:', result.substring(0, 500));
    
    return response.ok;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('Memory Integration Test');
  console.log('========================================');
  console.log('Gateway URL:', GATEWAY_URL);
  console.log('Experience Data:', EXPERIENCE_DATA_PATH);

  // 1. 测试存储
  await testMemoryStore();
  
  // 2. 测试检索
  await testMemoryRecall();
  
  // 3. 测试经验同步
  await testExperienceSync();
  
  // 4. 检查统计
  await checkMemoryStats();
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

main().catch(console.error);
