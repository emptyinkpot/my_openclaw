const { ContentPipeline } = require('./extensions/novel-manager/dist/core/ContentPipeline');

async function main() {
  console.log('=== 启动发布流水线（有头模式）===');
  console.log('作品: 枪与凋零之花 (workId: 7)');
  
  const pipeline = new ContentPipeline();
  
  const onProgress = (event) => {
    console.log(`[${event.step}] ${event.task} - ${event.detail || ''} (${event.percent}%)`);
  };
  
  try {
    const results = await pipeline.publishToFanqie({
      workId: 7,  // 枪与凋零之花
      headless: false,
      dryRun: false,
      onProgress,
    });
    
    console.log('\n结果:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('错误:', err.message);
    console.error(err.stack);
  }
}

main().catch(console.error);
