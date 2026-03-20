#!/usr/bin/env node

console.log('🚀 ====== 直接运行 ContentPipeline ======');

const { ContentPipeline } = require('./extensions/novel-manager/dist/core/ContentPipeline');

async function run() {
  try {
    console.log('🔧 创建 ContentPipeline 实例...');
    const pipeline = new ContentPipeline();
    
    console.log('▶️ 调用 publishToFanqie, workId: 7...');
    
    const results = await pipeline.publishToFanqie({
      workId: 7,
      headless: true,
      dryRun: true,
      onProgress: (event) => {
        console.log(`📊 [${event.stepLabel}] ${event.task} (${event.percent}%)`);
      }
    });
    
    console.log('\n✅ ====== 完成 ======');
    console.log('📋 结果:');
    console.log('   总章节数:', results.length);
    console.log('   成功数:', results.filter(r => r.success).length);
    
  } catch (error) {
    console.error('\n❌ ====== 失败 ======');
    console.error('📛 错误:', error.message);
    console.error(error.stack);
  }
}

run();
