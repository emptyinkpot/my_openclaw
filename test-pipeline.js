const { ContentPipeline } = require('./extensions/novel-manager/dist/core/ContentPipeline');

async function main() {
  console.log('=== 启动流水线（有头模式）===');
  
  const pipeline = new ContentPipeline();
  
  // 进度回调
  const onProgress = (event) => {
    console.log(`[${event.step}] ${event.task} (${event.percent}%)`);
  };
  
  try {
    // workId = 1 是 "枪与凋零之花"
    const results = await pipeline.publishToFanqie({
      workId: 1,
      headless: false,  // 有头模式
      dryRun: false,    // 真实发布
      skipStatusCheck: true,
      onProgress,
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n发布完成: 成功 ${successCount}/${results.length}`);
  } catch (err) {
    console.error('错误:', err.message);
  }
}

main().catch(console.error);
