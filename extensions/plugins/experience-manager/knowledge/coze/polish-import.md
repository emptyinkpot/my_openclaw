# 文本润色网站 - 资源库导入

## 一、资源文件

### 1.1 文件位置

```
storage/polish/resources.json
```

### 1.2 文件内容

| 字段 | 说明 |
|------|------|
| vocabulary | 词汇表（宏大叙事、古典词汇等） |
| banned | 禁用词表（现代网络/商业词汇，带替代词） |
| userSettings | 用户设置（古典比例、叙事视角、AI模型） |

---

## 二、导入流程

### 2.1 完整步骤

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('/workspace/projects/browser/default', {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--remote-debugging-port=9222']
  });
  const page = browser.pages()[0] || await browser.newPage();
  
  // 🔴 关键：设置对话框处理器，否则弹窗会导致脚本崩溃
  page.on('dialog', async dialog => {
    console.log('弹出对话框:', dialog.type(), '-', dialog.message());
    await dialog.accept();
  });
  
  // Step 1: 访问润色网站
  await page.goto('https://7d4jcknzqk.coze.site/');
  await page.waitForTimeout(3000);
  
  // Step 2: 点击资源库
  await page.click('button:has-text("资源库")');
  await page.waitForTimeout(2000);
  
  // Step 3: 点击一键导入
  await page.click('button:has-text("一键导入")');
  await page.waitForTimeout(2000);
  
  // Step 4: 上传文件
  const fileInputs = await page.$$('input[type="file"]');
  const filePath = '/workspace/projects/workspace/projects/novel-sync/storage/polish/resources.json';
  await fileInputs[0].setInputFiles(filePath);
  
  // Step 5: 等待上传完成
  await page.waitForTimeout(5000);
  
  // Step 6: 点击确认（如果有）
  const confirmBtn = await page.$('button:has-text("确认")');
  if (confirmBtn) {
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }
  
  console.log('导入完成！');
})();
```

---

## 三、注意事项

### 3.1 对话框处理

🔴 **关键**：必须设置对话框处理器，否则弹窗会导致脚本崩溃！

```javascript
// ✅ 正确：设置对话框处理器
page.on('dialog', async dialog => {
  console.log('弹出对话框:', dialog.type());
  await dialog.accept();
});

// ❌ 错误：不处理对话框会导致崩溃
// Protocol error: No dialog is showing
```

### 3.2 浏览器锁文件

如果浏览器异常关闭，再次启动会报错：

```
Failed to create a ProcessSingleton for your profile directory
```

**解决方案**：

```bash
pkill -f chrome
rm -f /workspace/projects/browser/default/SingletonLock
```

### 3.3 文件路径

文件路径必须是绝对路径：

```javascript
// ✅ 正确：绝对路径
const filePath = '/workspace/projects/workspace/projects/novel-sync/storage/polish/resources.json';

// ❌ 错误：相对路径可能找不到
const filePath = './storage/polish/resources.json';
```

---

## 四、常见问题

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 脚本崩溃 "No dialog is showing" | 弹出对话框未处理 | 设置 `page.on('dialog')` 处理器 |
| 浏览器启动失败 | 锁文件存在 | 删除 `SingletonLock` 文件 |
| 文件上传失败 | 路径不对 | 使用绝对路径 |
| 上传后无反应 | 没点确认按钮 | 检查并点击"确认"按钮 |
