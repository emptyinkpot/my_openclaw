# 项目脚本开发指南

## 快速开始

### 1. 创建新项目

```bash
# 复制模板
cp -r workspace/projects/_template workspace/projects/my-project

# 进入项目
cd workspace/projects/my-project

# 修改 package.json
# 修改 src/config.js
# 实现 src/main.js 中的任务
```

### 2. 项目目录结构

```
projects/{project-name}/
├── src/
│   ├── config.js           # 项目配置
│   ├── main.js             # 任务入口
│   ├── tasks/              # 具体任务（可选）
│   └── handlers/           # 消息处理器（可选）
├── output/                 # 输出目录（运行时生成）
│   ├── states/             # 登录状态
│   ├── screenshots/        # 截图
│   └── logs/               # 日志
├── package.json
└── README.md
```

## 开发流程

### 步骤1: 配置项目

```javascript
// src/config.js
const path = require('path');

const BASE_DIR = '/workspace/projects/output/my-project';

module.exports = {
  // 网站配置
  siteConfig: {
    name: 'my-site',
    baseUrl: 'https://example.com',
    headless: false,
    
    selectors: {
      loginBtn: 'button.login',
      loginCheck: 'button.login',
      userElement: '.user-avatar'
    },
    
    stateDir: path.join(BASE_DIR, 'states'),
    screenshotDir: path.join(BASE_DIR, 'screenshots'),
    maxScreenshots: 5
  },
  
  // 任务配置
  taskConfig: {
    dailyTask: {
      enabled: true,
      schedule: '0 9 * * *'  // 每天9点
    }
  }
};
```

### 步骤2: 实现任务

```javascript
// src/main.js
const { WebsiteAutomation, Logger } = require('../../modules/website-automation/src');
const { siteConfig } = require('./config');

const logger = new Logger({ level: 'info', console: true });

const tasks = {
  // 登录任务
  async login(auto) {
    logger.info('开始登录');
    
    await auto.goto();
    await auto.click(siteConfig.selectors.loginBtn);
    
    // 等待扫码
    const success = await auto.waitForLogin({
      maxWaitMs: 180000,
      onProgress: (ms) => {
        if (ms % 10000 === 0) {
          logger.info(`等待中... ${ms/1000}秒`);
        }
      }
    });
    
    if (!success) throw new Error('登录超时');
    
    await auto.saveState();
    return { success: true, message: '登录成功' };
  },
  
  // 检查任务
  async check(auto) {
    const isLoggedIn = await auto.checkLogin();
    return { success: true, isLoggedIn };
  },
  
  // 自定义任务
  async doSomething(auto) {
    // 1. 检查登录
    const isLoggedIn = await auto.checkLogin();
    if (!isLoggedIn) {
      throw new Error('未登录');
    }
    
    // 2. 执行业务操作
    await auto.goto('https://example.com/target-page');
    
    // 3. 提取数据
    const data = await auto.queryElements('.item', (el) => ({
      title: el.querySelector('.title')?.textContent,
      link: el.querySelector('a')?.href
    }));
    
    // 4. 截图
    await auto.screenshot('result');
    
    return { success: true, data };
  }
};

// 主函数
async function main() {
  const taskName = process.argv[2] || 'help';
  const args = process.argv.slice(3);
  
  const task = tasks[taskName];
  if (!task) {
    console.log('可用任务:', Object.keys(tasks).join(', '));
    process.exit(1);
  }
  
  const auto = new WebsiteAutomation(siteConfig);
  
  try {
    const result = await task(auto, args);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    logger.error('任务失败', { error: error.message });
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    await auto.close();
  }
}

main();
```

### 步骤3: 添加飞书支持（可选）

```javascript
// src/handlers/feishu.js
const { execSync } = require('child_process');
const path = require('path');

const MAIN_PATH = path.join(__dirname, '../main.js');

const commandMap = {
  '登录': { task: 'login' },
  '检查': { task: 'check' },
  '执行': { task: 'doSomething' }
};

function parseCommand(message) {
  for (const [keyword, cmd] of Object.entries(commandMap)) {
    if (message.includes(keyword)) {
      return cmd;
    }
  }
  return null;
}

function runTask(task) {
  try {
    const output = execSync(`node "${MAIN_PATH}" ${task}`, {
      encoding: 'utf8',
      timeout: 120000
    });
    return JSON.parse(output);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ... 主函数处理
```

### 步骤4: 配置定时任务

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天9点执行签到）
0 9 * * * cd /workspace/projects/my-project && node src/main.js signin >> output/logs/cron.log 2>&1
```

## 常用模式

### 模式1: 带重试的操作

```javascript
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      logger.warn(`重试 ${i + 1}/${maxRetries}`);
      await auto.sleep(2000);
    }
  }
}

// 使用
await retryOperation(() => auto.click('.submit-btn'));
```

### 模式2: 条件等待

```javascript
// 等待某个条件满足
async function waitForCondition(checkFn, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkFn()) return true;
    await auto.sleep(500);
  }
  return false;
}

// 使用：等待元素消失
await waitForCondition(async () => {
  const visible = await auto.page.locator('.loading').isVisible().catch(() => false);
  return !visible;
});
```

### 模式3: 数据对比

```javascript
const fs = require('fs');
const path = require('path');

async function checkForChanges(newData, cacheFile) {
  const cachePath = path.join(__dirname, '../output', cacheFile);
  
  // 读取旧数据
  let oldData = null;
  if (fs.existsSync(cachePath)) {
    oldData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  
  // 保存新数据
  fs.writeFileSync(cachePath, JSON.stringify(newData, null, 2));
  
  // 对比
  if (!oldData) return { hasChange: false, isFirstRun: true };
  
  const hasChange = JSON.stringify(oldData) !== JSON.stringify(newData);
  return { hasChange, isFirstRun: false, diff: computeDiff(oldData, newData) };
}
```

## 调试技巧

### 1. 本地调试

```bash
# 有头模式（可见浏览器）
headless: false

# 慢速模式
await auto.sleep(3000);  // 每个操作后等待

# 保留截图
maxScreenshots: 20
```

### 2. 日志调试

```javascript
// 开启调试日志
const logger = new Logger({ level: 'debug' });

// 在关键步骤加日志
logger.debug('当前URL', { url: auto.page.url() });
logger.debug('页面标题', { title: await auto.page.title() });
```

### 3. 截图调试

```javascript
// 关键步骤截图
await auto.screenshot('step-1-init');
await auto.click('.btn');
await auto.screenshot('step-2-after-click');
```

## 最佳实践

1. **配置分离**: 所有可变配置放在 `config.js`
2. **错误处理**: 每个任务都要有 try-catch
3. **资源释放**: 确保调用 `auto.close()`
4. **状态检查**: 操作前检查登录状态
5. **日志记录**: 关键步骤记录日志
6. **截图留存**: 重要操作后截图
