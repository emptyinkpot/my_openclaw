import { ContentPipeline } from './extensions/novel-manager/core/ContentPipeline';

async function main() {
  console.log('=== 测试流水线 ===');
  
  const pipeline = new ContentPipeline();
  
  // 进度回调
  const onProgress = (event: any) => {
    console.log(`[${event.step}] ${event.task} (${event.percent}%)`);
  };
  
  try {
    // 先扫描作品
    console.log('\n=== 扫描番茄作品 ===');
    const scanResult = await pipeline.scanFanqieWorks({ accountId: 'account_1' });
    console.log('扫描结果:', scanResult.success ? `成功，${scanResult.works.length} 个作品` : `失败: ${scanResult.error}`);
    
    if (scanResult.works.length > 0) {
      const firstWork = scanResult.works[0];
      console.log(`\n第一个作品: ${firstWork.title} (workId: ${firstWork.workId})`);
      
      // 发布测试（dryRun 模式）
      console.log('\n=== 测试发布 (dryRun) ===');
      const results = await pipeline.publishToFanqie({
        workId: parseInt(firstWork.workId),
        startChapter: 1,
        endChapter: 3,
        dryRun: true,
        headless: true,
        onProgress,
      });
      
      console.log(`\n发布结果: ${results.filter(r => r.success).length}/${results.length} 成功`);
    }
  } catch (err: any) {
    console.error('错误:', err.message);
  }
}

main().catch(console.error);
