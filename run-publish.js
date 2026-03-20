const { ContentPipeline } = require('./extensions/novel-manager/dist/core/ContentPipeline');

async function main() {
  const workId = parseInt(process.env.WORK_ID || '7', 10);
  const headless = process.env.HEADLESS === 'true';
  
  console.log('=== 启动发布流水线 ===');
  console.log(`作品 ID: ${workId}`);
  console.log(`有头模式: ${!headless}`);
  
  const pipeline = new ContentPipeline();
  
  const onProgress = (event) => {
    console.log(`[${event.step}] ${event.task} - ${event.detail || ''} (${event.percent}%)`);
  };
  
  try {
    const results = await pipeline.publishToFanqie({
      workId,
      headless,
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
