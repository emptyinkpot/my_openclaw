const fs = require('fs');
const path = require('path');

/**
 * 截图管理工具 - 自动清理历史截图
 */
class ScreenshotManager {
  constructor(options = {}) {
    this.outputDir = options.outputDir || '/workspace/projects/output/baimeng_steps';
    this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 默认保留7天
    this.maxCount = options.maxCount || 50; // 默认最多保留50张
    this.prefix = options.prefix || 'baimeng_'; // 文件名前缀
  }

  /**
   * 确保输出目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 创建目录: ${this.outputDir}`);
    }
  }

  /**
   * 按时间清理旧截图（保留最近N天的）
   */
  cleanupByAge() {
    this.ensureDir();
    const now = Date.now();
    let deleted = 0;

    const files = fs.readdirSync(this.outputDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))  // 清理所有截图
      .map(f => ({
        name: f,
        path: path.join(this.outputDir, f),
        time: fs.statSync(path.join(this.outputDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 最新的在前

    for (const file of files) {
      if (now - file.time > this.maxAge) {
        fs.unlinkSync(file.path);
        deleted++;
        console.log(`🗑️  删除旧截图: ${file.name}`);
      }
    }

    if (deleted > 0) {
      console.log(`✅ 已清理 ${deleted} 张过期截图`);
    }
    return deleted;
  }

  /**
   * 按数量清理（只保留最新的N张）
   */
  cleanupByCount() {
    this.ensureDir();
    let deleted = 0;

    const files = fs.readdirSync(this.outputDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))  // 清理所有截图
      .map(f => ({
        name: f,
        path: path.join(this.outputDir, f),
        time: fs.statSync(path.join(this.outputDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 最新的在前

    // 删除超出的旧文件
    if (files.length > this.maxCount) {
      const toDelete = files.slice(this.maxCount);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        deleted++;
        console.log(`🗑️  删除旧截图: ${file.name}`);
      }
    }

    if (deleted > 0) {
      console.log(`✅ 已清理 ${deleted} 张旧截图（保留最新 ${this.maxCount} 张）`);
    }
    return deleted;
  }

  /**
   * 清理所有截图（重置）
   */
  cleanupAll() {
    this.ensureDir();
    let deleted = 0;

    const files = fs.readdirSync(this.outputDir)
      .filter(f => f.startsWith(this.prefix) && f.endsWith('.png'));

    for (const file of files) {
      fs.unlinkSync(path.join(this.outputDir, file));
      deleted++;
    }

    console.log(`🗑️  已清理所有 ${deleted} 张截图`);
    return deleted;
  }

  /**
   * 智能清理（先按数量，再按时间）
   */
  cleanup() {
    console.log('\n🧹 开始清理截图...');
    const byCount = this.cleanupByCount();
    const byAge = this.cleanupByAge();
    
    const remaining = this.getScreenshotList().length;
    console.log(`📊 当前剩余 ${remaining} 张截图`);
    
    return byCount + byAge;
  }

  /**
   * 生成带时间戳的截图路径
   */
  getScreenshotPath(name) {
    this.ensureDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return path.join(this.outputDir, `${this.prefix}${name}_${timestamp}.png`);
  }

  /**
   * 获取当前所有截图列表
   */
  getScreenshotList() {
    this.ensureDir();
    return fs.readdirSync(this.outputDir)
      .filter(f => f.startsWith(this.prefix) && f.endsWith('.png'))
      .map(f => ({
        name: f,
        path: path.join(this.outputDir, f),
        time: fs.statSync(path.join(this.outputDir, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);
  }

  /**
   * 打印当前截图状态
   */
  printStatus() {
    const list = this.getScreenshotList();
    console.log('\n📸 当前截图状态:');
    console.log(`   总数: ${list.length} 张`);
    console.log(`   目录: ${this.outputDir}`);
    
    if (list.length > 0) {
      console.log('\n   最近5张:');
      list.slice(0, 5).forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name} (${f.time.toLocaleString()})`);
      });
    }
  }
}

module.exports = ScreenshotManager;

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
  const manager = new ScreenshotManager();
  
  console.log('=== 截图管理工具 ===');
  console.log('\n用法:');
  console.log('  1. 导入使用: const ScreenshotManager = require("./screenshot_manager");');
  console.log('  2. 创建实例: const manager = new ScreenshotManager({ maxCount: 30 });');
  console.log('  3. 自动清理: manager.cleanup();');
  console.log('  4. 生成路径: const path = manager.getScreenshotPath("登录成功");');
  
  console.log('\n--- 当前状态 ---');
  manager.printStatus();
  
  console.log('\n--- 执行清理 ---');
  manager.cleanup();
}
