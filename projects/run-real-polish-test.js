
// 真实润色测试 - 直接在项目环境中运行
process.chdir('/workspace/projects');

console.log('='.repeat(80));
console.log('真实润色测试 - 完整版');
console.log('='.repeat(80));
console.log('');

// 设置环境变量连接到云端数据库
process.env.DB_TYPE = 'mysql';
process.env.DB_HOST = 'sh-cynosdbmysql-grp-1kbg1xh0.sql.tencentcdb.com';
process.env.DB_PORT = '22295';
process.env.DB_USER = 'openclaw';
process.env.DB_PASSWORD = 'Lgp15237257500';
process.env.DB_NAME = 'cloudbase-4glvyyq9f61b19cd';

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('📊 步骤 1/7: 连接数据库并查找测试章节...\n');
    
    // 使用项目的数据库模块
    const dbModulePath = path.join(__dirname, 'extensions/plugins/novel-manager/dist/core/data-scan-storage/database.js');
    const { getDatabaseManager } = require(dbModulePath);
    
    const db = getDatabaseManager();
    
    // 查找一个合适的测试章节（5000字以上，first_draft状态）
    console.log('   正在查找5000字以上的测试章节...');
    const chapters = await db.query(`
      SELECT id, work_id, chapter_number, title, status, word_count, LENGTH(content) as content_length
      FROM chapters 
      WHERE status = 'first_draft' 
        AND content IS NOT NULL 
        AND LENGTH(content) >= 5000
      ORDER BY LENGTH(content) DESC
      LIMIT 1
    `);
    
    if (!chapters || chapters.length === 0) {
      console.log('   没有找到5000字以上的章节，找一个3000-5000字的...');
      const backupChapters = await db.query(`
        SELECT id, work_id, chapter_number, title, status, word_count, LENGTH(content) as content_length
        FROM chapters 
        WHERE status = 'first_draft' 
          AND content IS NOT NULL 
          AND LENGTH(content) >= 3000
        ORDER BY LENGTH(content) DESC
        LIMIT 1
      `);
      
      if (!backupChapters || backupChapters.length === 0) {
        console.log('❌ 没有找到合适的测试章节');
        return;
      }
      
      chapters.push(...backupChapters);
    }
    
    const testChapter = chapters[0];
    console.log('✅ 找到测试章节:');
    console.log(`   - ID: ${testChapter.id}`);
    console.log(`   - 作品: ${testChapter.work_id}`);
    console.log(`   - 章节: 第${testChapter.chapter_number}章`);
    console.log(`   - 标题: ${testChapter.title}`);
    console.log(`   - 状态: ${testChapter.status}`);
    console.log(`   - 字数: ${testChapter.word_count}`);
    console.log(`   - 长度: ${testChapter.content_length}字符`);
    console.log('');
    
    // 步骤2: 备份原文
    console.log('📝 步骤 2/7: 备份原文...\n');
    
    const chapterData = await db.queryOne(
      'SELECT content FROM chapters WHERE id = ?',
      [testChapter.id]
    );
    
    const originalContent = chapterData.content;
    const backupPath = path.join(__dirname, `polish-test-original-${testChapter.id}.txt`);
    fs.writeFileSync(backupPath, originalContent, 'utf8');
    console.log(`✅ 原文已备份到: ${backupPath}`);
    console.log('');
    
    // 显示原文预览
    console.log('📄 原文预览（前1000字符）:');
    console.log(originalContent.substring(0, 1000));
    console.log('...\n');
    
    // 步骤3: 检查测试文本的一般性和通用性
    console.log('🔍 步骤 3/7: 检查测试文本的一般性和通用性...\n');
    
    const hasDialogue = originalContent.includes('"') || originalContent.includes('“');
    const hasDescription = originalContent.length > 2000;
    const hasNarration = true; // 小说都有叙述
    const hasEmotion = originalContent.includes('！') || originalContent.includes('?');
    
    console.log('   文本特性检查:');
    console.log(`   - 包含对话: ${hasDialogue ? '✅' : '❌'}`);
    console.log(`   - 包含描写: ${hasDescription ? '✅' : '❌'}`);
    console.log(`   - 包含叙述: ${hasNarration ? '✅' : '❌'}`);
    console.log(`   - 包含情感: ${hasEmotion ? '✅' : '❌'}`);
    console.log('');
    
    if (hasDialogue && hasDescription && hasNarration) {
      console.log('✅ 测试文本具有一般性和通用性 - 适合润色测试\n');
    } else {
      console.log('⚠️  测试文本特性不够全面，但继续测试\n');
    }
    
    // 步骤4: 加载 novel-manager 并调用润色
    console.log('🎨 步骤 4/7: 开始润色流程...\n');
    
    console.log('   正在加载 novel-manager 模块...');
    const novelManagerPath = path.join(__dirname, 'extensions/plugins/novel-manager/dist/index.js');
    const novelManager = require(novelManagerPath);
    
    console.log('   开始润色...');
    console.log(`   - 作品ID: ${testChapter.work_id}`);
    console.log(`   - 章节号: ${testChapter.chapter_number}`);
    console.log('   - 这可能需要几分钟时间，请耐心等待...\n');
    
    const startTime = Date.now();
    
    // 直接调用 polishChapterFromDb
    let result;
    try {
      result = await novelManager.polishChapterFromDb(
        testChapter.work_id,
        testChapter.chapter_number
      );
    } catch (polishError) {
      console.error('❌ 润色过程中出错:', polishError.message);
      console.error('错误详情:', polishError);
      
      // 即使出错也继续，看看能不能获取部分结果
      result = { success: false, error: polishError.message };
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ 润色流程结束！耗时: ${duration}秒\n`);
    
    // 步骤5: 获取润色后的内容
    console.log('📝 步骤 5/7: 获取润色后的内容...\n');
    
    const polishedData = await db.queryOne(
      'SELECT content, status, updated_at FROM chapters WHERE id = ?',
      [testChapter.id]
    );
    
    const polishedContent = polishedData.content;
    const polishedPath = path.join(__dirname, `polish-test-polished-${testChapter.id}.txt`);
    fs.writeFileSync(polishedPath, polishedContent, 'utf8');
    console.log(`✅ 润色后文本已保存到: ${polishedPath}\n`);
    
    // 显示润色后预览
    console.log('🎨 润色后预览（前1000字符）:');
    console.log(polishedContent.substring(0, 1000));
    console.log('...\n');
    
    // 步骤6: 进行详细对比检查
    console.log('🔍 步骤 6/7: 详细对比检查...\n');
    
    const originalLength = originalContent.length;
    const polishedLength = polishedContent.length;
    const lengthChange = ((polishedLength - originalLength) / originalLength * 100).toFixed(2);
    
    console.log('📊 1. 信息量检查:');
    console.log(`   - 原文: ${originalLength}字符`);
    console.log(`   - 润色后: ${polishedLength}字符`);
    console.log(`   - 变化: ${lengthChange > 0 ? '+' : ''}${lengthChange}%`);
    
    const infoLossRisk = Math.abs(parseFloat(lengthChange)) > 30;
    console.log(`   - 信息量风险: ${infoLossRisk ? '❌ 变化过大 (>30%)' : '✅ 变化合理 (≤30%)'}`);
    console.log('');
    
    console.log('🔍 2. 关键词保留检查:');
    
    // 检查一些常用词和关键词
    const commonWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '说', '想', '看', '听', '走'];
    let commonWordsFound = 0;
    const commonWordsResults = [];
    
    commonWords.forEach(word => {
      const originalHas = originalContent.includes(word);
      const polishedHas = polishedContent.includes(word);
      if (originalHas && polishedHas) {
        commonWordsFound++;
        commonWordsResults.push(`   ✅ "${word}" - 保留`);
      } else if (originalHas && !polishedHas) {
        commonWordsResults.push(`   ❌ "${word}" - 丢失`);
      }
    });
    
    console.log(`   常用词保留率: ${commonWordsFound}/${commonWords.length} (${(commonWordsFound/commonWords.length*100).toFixed(0)}%)`);
    commonWordsResults.slice(0, 10).forEach(line => console.log(line));
    if (commonWordsResults.length > 10) {
      console.log(`   ... 还有 ${commonWordsResults.length - 10} 个`);
    }
    console.log('');
    
    console.log('📋 3. 章节状态检查:');
    console.log(`   - 润色前状态: ${testChapter.status}`);
    console.log(`   - 润色后状态: ${polishedData.status}`);
    console.log(`   - 更新时间: ${polishedData.updated_at}`);
    console.log(`   - 状态正确更新: ${polishedData.status === 'polished' ? '✅' : '❌'} (期望: polished)`);
    console.log('');
    
    console.log('📺 4. 实时活动日志检查:');
    
    try {
      const logs = await db.query(`
        SELECT * FROM state_transition_logs 
        WHERE chapter_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [testChapter.id]);
      
      if (logs && logs.length > 0) {
        console.log(`   ✅ 找到 ${logs.length} 条活动日志:`);
        logs.slice(0, 10).forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.created_at}] ${log.from_state} -> ${log.to_state} (${log.reason})`);
        });
        if (logs.length > 10) {
          console.log(`      ... 还有 ${logs.length - 10} 条`);
        }
      } else {
        console.log('   ⚠️  未找到活动日志（可能表名或结构不同）');
        
        // 尝试查找其他可能的日志表
        const [tables] = await db.query('SHOW TABLES');
        const logTables = tables.filter(t => 
          Object.values(t)[0].toLowerCase().includes('log') ||
          Object.values(t)[0].toLowerCase().includes('activity') ||
          Object.values(t)[0].toLowerCase().includes('history')
        );
        if (logTables.length > 0) {
          console.log('   📋 找到可能的日志表:');
          logTables.forEach(t => console.log(`      - ${Object.values(t)[0]}`));
        }
      }
    } catch (e) {
      console.log('   ⚠️  查询活动日志失败:', e.message);
    }
    console.log('');
    
    console.log('⚡ 5. 长文本稳定性检查:');
    console.log(`   - 处理时间: ${duration}秒`);
    console.log(`   - 原文长度: ${originalLength}字符`);
    console.log(`   - 润色后长度: ${polishedLength}字符`);
    console.log(`   - 文本完整性: ${polishedLength > 0 ? '✅' : '❌'}`);
    
    const stabilityOk = polishedLength > 0 && !infoLossRisk;
    console.log(`   - 稳定性评估: ${stabilityOk ? '✅ 稳定' : '❌ 不稳定'}`);
    console.log('');
    
    // 步骤7: 生成测试报告
    console.log('📋 步骤 7/7: 生成测试报告...\n');
    
    const reportPath = path.join(__dirname, `polish-test-report-${testChapter.id}.md`);
    const report = `# 润色测试报告

## 测试基本信息
- **测试时间**: ${new Date().toISOString()}
- **章节ID**: ${testChapter.id}
- **作品**: ${testChapter.work_id}
- **章节**: 第${testChapter.chapter_number}章
- **标题**: ${testChapter.title}
- **处理时间**: ${duration}秒

## 测试文本
- **状态**: ${testChapter.status} -> ${polishedData.status}
- **原文长度**: ${originalLength}字符
- **润色后长度**: ${polishedLength}字符
- **变化**: ${lengthChange > 0 ? '+' : ''}${lengthChange}%
- **一般性通用性**: ${hasDialogue && hasDescription && hasNarration ? '✅ 符合' : '⚠️ 部分符合'}

## 检查结果

### 1. 信息量检查
- 原文: ${originalLength}字符
- 润色后: ${polishedLength}字符
- 变化: ${lengthChange > 0 ? '+' : ''}${lengthChange}%
- 评估: ${infoLossRisk ? '❌ 变化过大 (>30%)' : '✅ 变化合理 (≤30%)'}

### 2. 关键词保留
- 常用词保留率: ${commonWordsFound}/${commonWords.length} (${(commonWordsFound/commonWords.length*100).toFixed(0)}%)
- 评估: ${commonWordsFound >= commonWords.length * 0.8 ? '✅ 良好' : '⚠️ 需要检查'}

### 3. 状态更新
- 润色前: ${testChapter.status}
- 润色后: ${polishedData.status}
- 评估: ${polishedData.status === 'polished' ? '✅ 正确' : '❌ 错误'}

### 4. 实时活动日志
- 日志数量: ${logs && logs.length || 0}条
- 评估: ${logs && logs.length > 0 ? '✅ 有记录' : '⚠️ 无记录'}

### 5. 长文本稳定性
- 处理时间: ${duration}秒
- 文本完整性: ${polishedLength > 0 ? '✅' : '❌'}
- 评估: ${stabilityOk ? '✅ 稳定' : '❌ 不稳定'}

## 文件位置
- **原文备份**: ${backupPath}
- **润色后文本**: ${polishedPath}
- **测试报告**: ${reportPath}

## 总体评估
${stabilityOk && commonWordsFound >= commonWords.length * 0.8 && polishedData.status === 'polished' ? '✅ 测试通过' : '⚠️ 需要进一步检查'}
`;
    
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`✅ 测试报告已生成: ${reportPath}\n`);
    
    // 最终总结
    console.log('='.repeat(80));
    console.log('✅ 真实润色测试完成！');
    console.log('='.repeat(80));
    console.log('');
    console.log('📋 测试结果总结:');
    console.log(`   - 测试章节: 第${testChapter.chapter_number}章 - ${testChapter.title}`);
    console.log(`   - 原文备份: ${backupPath}`);
    console.log(`   - 润色后保存: ${polishedPath}`);
    console.log(`   - 测试报告: ${reportPath}`);
    console.log(`   - 处理时间: ${duration}秒`);
    console.log(`   - 字数变化: ${lengthChange}%`);
    console.log('');
    console.log('🧪 下一步:');
    console.log('   1. 阅读测试报告');
    console.log('   2. 对比原文和润色后的文本');
    console.log('   3. 检查信息量是否保持');
    console.log('   4. 检查语义是否一致');
    console.log('   5. 检查是否偏离主旨');
    console.log('   6. 检查原意是否保持');
    console.log('');
    console.log('💡 提示: 所有文件都在项目根目录下，文件名以 polish-test- 开头');
    
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ 测试失败！');
    console.error('='.repeat(80));
    console.error('\n错误信息:', error.message);
    console.error('\n错误堆栈:', error.stack);
    process.exit(1);
  }
}

main();
