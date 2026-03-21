#!/usr/bin/env node

/**
 * 查看本地作品和章节
 */

console.log('[Check] ====== 查看本地作品 ======');

const { NovelService } = require('./extensions/apps/novel-manager/dist/services/novel-service');

async function check() {
  try {
    const service = new NovelService();
    await service.initTables();
    
    // 查看本地作品
    const works = await service.getWorks();
    console.log('[Check] 本地作品列表:');
    works?.forEach((work, idx) => {
      console.log(`  ${idx + 1}. ID: ${work.id}, 标题: ${work.title}`);
    });
    
    // 查看每个作品的章节
    for (const work of works || []) {
      console.log(`\n[Check] 作品 ${work.title} (ID: ${work.id}) 的章节:`);
      const chapters = await service.getChaptersByWorkId(work.id);
      console.log(`  章节数量: ${chapters?.length || 0}`);
      
      if (chapters && chapters.length > 0) {
        console.log('  最新章节:');
        chapters.slice(-5).forEach((ch, idx) => {
          console.log(`    ${ch.chapterNumber}. ${ch.title} (${ch.wordCount}字)`);
        });
      }
    }
    
    console.log('\n[Check] ====== 查看完成 ======');
    
  } catch (error) {
    console.error('[Check] 错误:', error);
  }
}

check();
