#!/usr/bin/env node

/**
 * 直接运行 ContentPipeline 的 publishToFanqie 方法
 */

console.log('🚀 ====== 直接运行 ContentPipeline ======');

async function runPipeline() {
  try {
    console.log('📦 加载 ContentPipeline...');
    const { ContentPipeline } = require('./extensions/novel-manager/dist/core/ContentPipeline');
    
    console.log('🔧 创建 ContentPipeline 实例...');
    const pipeline = new ContentPipeline();
    
    console.log('▶️ 调用 publishToFanqie, workId: 7...');
    console.log('   参数:');
    console.log('   - workId: 7');
    console.log('   - headless: true');
    console.log('   - dryRun: true (先测试，不真发布)');
    
    const results = await pipeline.publishToFanqie({
      workId: 7,
      headless: true,
      dryRun: true,
      onProgress: (event) => {
        console.log(`📊 [进度] ${event.stepLabel}: ${event.task} (${event.percent}%)`);
      }
    });
    
    console.log('\n✅ ====== 完成 ======');
    console.log('📋 结果:');
    console.log('   总章节数:', results.length);
    console.log('   成功数:', results.filter(r => r.success).length);
    console.log('   失败数:', results.filter(r => !r.success).length);
    
    if (results.length > 0) {
      console.log('\n📝 详细结果:');
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.success ? '✅' : '❌'} ${r.task?.workTitle || '未知'} 第${r.task?.chapterNumber || '?'}章: ${r.error || '成功'}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ ====== 失败 ======');
    console.error('📛 错误信息:', error.message);
    console.error('\n🔍 错误堆栈:');
    console.error(error.stack);
  }
}

runPipeline();
