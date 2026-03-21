# 番茄小说 - 操作知识

## 一、作品列表

### 1.1 获取作品列表

```javascript
await page.goto('https://fanqienovel.com/main/writer/book-manage');
await page.waitForSelector('[class*="book-item"]');

const works = await page.$$eval('[class*="book-item"]', items => 
  items.map(item => ({
    title: item.querySelector('[class*="title"]')?.innerText,
    id: item.getAttribute('data-id'),
    url: item.querySelector('a')?.href
  }))
);
```

---

## 二、章节管理

### 2.1 查看章节列表

```javascript
// 进入作品管理
await page.click(`[data-id="${workId}"]`);

// 等待章节列表加载
await page.waitForSelector('[class*="chapter-list"]');

// 获取章节列表
const chapters = await page.$$eval('[class*="chapter-item"]', items =>
  items.map(item => ({
    title: item.innerText,
    id: item.getAttribute('data-id')
  }))
);
```

### 2.2 编辑章节

```javascript
// 点击章节进入编辑
await page.click(`[data-id="${chapterId}"]`);

// 等待编辑器加载
await page.waitForSelector('[contenteditable="true"]');

// 获取/编辑内容
const content = await page.$eval('[contenteditable="true"]', el => el.innerText);
```

---

## 三、内容复制

### 3.1 复制章节内容

```javascript
// 全选内容
await page.click('[contenteditable="true"]');
await page.keyboard.press('Control+A');

// 复制
await page.keyboard.press('Control+C');

// 获取剪贴板内容
const text = await page.evaluate(() => navigator.clipboard.readText());
```

---

## 四、操作速查表

| 操作 | URL/选择器 | 说明 |
|------|------------|------|
| 作品列表 | `/main/writer/book-manage` | 所有作品 |
| 章节编辑 | `/main/writer/chapter-edit` | 编辑章节 |
| 编辑器 | `[contenteditable="true"]` | 内容编辑区 |
| 保存 | `button:has-text("保存")` | 保存章节 |
