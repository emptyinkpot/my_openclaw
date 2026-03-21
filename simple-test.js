#!/usr/bin/env node

const { FanqieSimplePipeline } = require('./extensions/apps/novel-manager/dist/core/fanqie-simple-pipeline/FanqieSimplePipeline');

console.log('[TEST] 直接真实测试 FanqieSimplePipeline');
console.log('[TEST] 账号: account_2');
console.log('[TEST] 真实发布！');

async function test() {
  try {
    const pipeline = new FanqieSimplePipeline();
    
    const results = await pipeline.publishToFanqie({
      workId: 9,
      accountId: 'account_2',
      headless: true,
      dryRun: false,
      onProgress: (e) => {
        console.log(`[${e.stepLabel}] ${e.task} (${e.percent}%)`);
        if (e.detail) console.log('  详情:', e.detail);
        if (e.error) console.log('  ❌ 错误:', e.error);
      }
    });
    
    console.log('\n[TEST] 真实发布完成！结果:', results);
  } catch (err) {
    console.error('[TEST] 发布失败:', err);
    console.error('[TEST] 错误堆栈:', err.stack);
  }
}

test();
