/**
 * 番茄批量发布脚本
 * 调用 novel-manager 的 FanqieSimplePipeline 进行发布
 */

const path = require('path');
const novelManagerPath = '/workspace/projects/extensions/plugins/novel-manager';

async function runPublish() {
  console.log('[AutoPublish] ====== 开始批量发布 ======');
  console.log('[AutoPublish] 当前时间:', new Date().toISOString());

  try {
    // 切换到 novel-manager 目录以避免相对路径问题
    process.chdir(novelManagerPath);

    // 动态加载 NovelService（使用编译后的 JS 文件）
    const distPath = path.join(novelManagerPath, 'dist');
    const { NovelService } = require(path.join(distPath, 'services', 'novel-service'));

    const service = new NovelService();
    await service.initTables();

    console.log('[AutoPublish] 服务初始化完成');

    // 启动流水线
    const result = await service.startPipeline({
      workId: 9,  // 默认作品ID
      dryRun: false,  // 实际发布（不是模拟）
    });

    if (result.success) {
      console.log('[AutoPublish] ✓ 流水线已启动');
      console.log('[AutoPublish] 进度ID:', result.progressId);

      // 等待一段时间让流水线运行
      console.log('[AutoPublish] 等待流水线完成...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒

      console.log('[AutoPublish] ====== 批量发布完成 ======');
    } else {
      console.error('[AutoPublish] ✗ 启动失败:', result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error('[AutoPublish] 执行失败:', err);
    console.error('[AutoPublish] 错误堆栈:', err.stack);
    process.exit(1);
  }
}

runPublish();
