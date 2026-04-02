# AI 编码操作规范 (AI Coding Standard)

> 版本: 1.0  
> 创建时间: 2026-03-12  
> 适用范围: 所有代码生成任务  
> 强制执行: 是

---

## 零、核心原则 (Core Principles)

### 0.1 必须始终遵循

| 优先级 | 原则 | 说明 |
|--------|------|------|
| P0 | **可读性 > 简洁性** | 代码是写给人看的，机器只是顺便执行 |
| P0 | **显式 > 隐式** | 不要让人猜测代码的意图 |
| P0 | **防御性编程** | 永远假设输入可能是错误的 |
| P1 | **DRY (不要重复)** | 发现重复立即抽象 |
| P1 | **单一职责** | 一个函数只做一件事 |
| P2 | **提前返回** | 减少嵌套层级 |

### 0.2 禁止事项

- ❌ 禁止使用难以理解的语法糖
- ❌ 禁止省略错误处理
- ❌ 禁止使用魔法数字
- ❌ 禁止超过 3 层嵌套
- ❌ 禁止函数超过 50 行（特殊情况需注释说明）

---

## 一、代码风格规范 (Code Style)

### 1.1 命名规范

#### 变量命名

```javascript
// ✅ 正确 - 语义清晰
const userName = '张三';
const isLoggedIn = true;
const maxRetryCount = 3;

// ❌ 错误 - 无意义或模糊
const x = '张三';
const flag = true;
const n = 3;
```

#### 函数命名

```javascript
// ✅ 正确 - 动词 + 名词
function getUserById(id) { }
function validateEmailFormat(email) { }
function saveConfigurationToFile(config) { }

// ❌ 错误 - 不清晰
function handle(data) { }
function process(input) { }
function doSomething() { }
```

#### 常量命名

```javascript
// ✅ 正确 - 全大写下划线
const MAX_FILE_SIZE = 1024 * 1024;  // 1MB
const DEFAULT_TIMEOUT_MS = 30000;
const API_BASE_URL = 'https://api.example.com';

// ❌ 错误
const maxFileSize = 1024 * 1024;
```

#### 布尔变量

```javascript
// ✅ 正确 - 使用 is/has/can/should 前缀
const isEnabled = true;
const hasPermission = false;
const canWrite = true;
const shouldRetry = false;

// ❌ 错误
const enabled = true;
const permission = false;
```

### 1.2 代码格式

#### 缩进与空格

```javascript
// ✅ 正确 - 2空格缩进，适当空行
class UserService {
  constructor(database) {
    this.database = database;
    this.cache = new Map();
  }

  async findById(id) {
    if (!id) {
      throw new Error('ID is required');
    }

    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    const user = await this.database.query('SELECT * FROM users WHERE id = ?', [id]);
    this.cache.set(id, user);

    return user;
  }
}
```

#### 行长度限制

```javascript
// ✅ 正确 - 不超过 100 字符
const result = await fetchUserDataWithCache(
  userId,
  { includeProfile: true, timeout: 5000 }
);

// ❌ 错误 - 过长
const result = await fetchUserDataWithCache(userId, { includeProfile: true, timeout: 5000, retryCount: 3, ignoreCache: false });
```

### 1.3 字符串规范

```javascript
// ✅ 正确 - 模板字符串处理动态内容
const message = `Hello, ${userName}! You have ${unreadCount} unread messages.`;

// ✅ 正确 - 单引号用于静态字符串
const status = 'active';

// ❌ 错误 - 不必要的字符串拼接
const message = 'Hello, ' + userName + '! You have ' + unreadCount + ' unread messages.';
```

---

## 二、注释规范 (Comments)

### 2.1 必须注释的场景

#### 函数/方法注释 (JSDoc)

```javascript
/**
 * 根据用户ID获取用户信息
 * 
 * 优先从缓存读取，缓存未命中则查询数据库
 * 查询结果会自动写入缓存
 * 
 * @param {string} id - 用户ID，必须为有效的UUID格式
 * @param {Object} options - 查询选项
 * @param {boolean} [options.includeDeleted=false] - 是否包含已删除用户
 * @param {number} [options.timeout=5000] - 查询超时时间（毫秒）
 * @returns {Promise<User|null>} 用户对象，未找到返回null
 * @throws {Error} 当ID格式无效时抛出
 * 
 * @example
 * const user = await getUserById('550e8400-e29b-41d4-a716-446655440000');
 * if (user) {
 *   console.log(user.name);
 * }
 */
async function getUserById(id, options = {}) {
  // 实现...
}
```

#### 复杂逻辑注释

```javascript
// ✅ 正确 - 解释"为什么"而不是"是什么"
// 使用双重检查锁定模式，避免高并发下的竞态条件
// 参考: https://en.wikipedia.org/wiki/Double-checked_locking
if (!instance) {
  synchronized(lock) {
    if (!instance) {
      instance = createInstance();
    }
  }
}

// ❌ 错误 - 只描述代码做了什么
// 检查instance是否存在，如果不存在则加锁，然后再次检查...
```

#### 常量注释

```javascript
// 邮件发送重试间隔（毫秒）
// 设置为5秒是为了避免触发服务商的速率限制
const EMAIL_RETRY_INTERVAL_MS = 5000;

// 最大文件上传大小（字节）
// 10MB = 10 * 1024 * 1024
const MAX_UPLOAD_SIZE_BYTES = 10485760;
```

### 2.2 禁止的注释

```javascript
// ❌ 禁止 - 无意义的注释
let count = 0;  // 初始化计数器为0

// ❌ 禁止 - 与代码重复的注释
// 递增计数器
count++;

// ❌ 禁止 - 用注释解释糟糕的命名
// 这个变量存储用户的临时数据
tmp = fetchData();  // 应该改名为 userTemporaryCache

// ❌ 禁止 - 遗留的调试代码
// console.log('debug:', data);
```

### 2.3 TODO 注释规范

```javascript
// ✅ 正确 - 包含上下文和原因
// TODO: 添加输入验证，当前假设输入总是合法的
// 需要处理负数和大数溢出的情况
// Issue: #123
function calculateFactorial(n) {
  // ...
}

// ✅ 正确 - FIXME 标记需要修复的代码
// FIXME: 这里的硬编码URL需要改为配置文件读取
// 当前仅为开发环境使用，生产环境会失败
const API_URL = 'http://localhost:3000/api';

// ❌ 错误 - 无意义的 TODO
// TODO: 优化
function process() {
  // ...
}
```

---

## 三、错误处理规范 (Error Handling)

### 3.1 基本原则

**所有可能出错的地方都必须处理错误**

```javascript
// ✅ 正确 - 完整的错误处理
async function fetchUserData(userId) {
  try {
    if (!userId) {
      throw new ValidationError('用户ID不能为空');
    }

    const response = await api.get(`/users/${userId}`);
    
    if (!response.ok) {
      throw new ApiError(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // 记录错误日志
    logger.error('获取用户数据失败', { 
      userId, 
      error: error.message,
      stack: error.stack 
    });
    
    // 根据错误类型返回友好的错误信息
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    
    if (error instanceof ApiError) {
      return { success: false, error: '服务暂时不可用，请稍后重试' };
    }
    
    return { success: false, error: '未知错误' };
  }
}

// ❌ 错误 - 忽略错误
async function fetchUserData(userId) {
  const response = await api.get(`/users/${userId}`);
  const data = await response.json();  // 如果response.ok为false会报错
  return data;
}
```

### 3.2 错误类型定义

```javascript
// ✅ 正确 - 自定义错误类
class AppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;  // 可预期的业务错误
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} 未找到`, 'NOT_FOUND', 404);
  }
}

class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}
```

### 3.3 异步错误处理

```javascript
// ✅ 正确 - Promise 错误处理
fetchData()
  .then(data => processData(data))
  .then(result => saveResult(result))
  .catch(error => {
    logger.error('数据处理流程失败', error);
    // 优雅降级
    return getDefaultData();
  });

// ✅ 正确 - async/await 错误处理
async function processUserData(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    return { user, orders };
  } catch (error) {
    logger.error('处理用户数据失败', { userId, error });
    throw error;  // 或返回默认值
  }
}

// ❌ 错误 - 混合使用 await 和回调
data = await fetchData().catch(err => {
  // 错误处理逻辑...
});
```

### 3.4 错误日志规范

```javascript
// ✅ 正确 - 包含上下文的错误日志
logger.error('用户登录失败', {
  userId: user.id,
  ipAddress: req.ip,
  attemptTime: new Date().toISOString(),
  errorType: error.constructor.name,
  errorMessage: error.message,
  stack: error.stack
});

// ❌ 错误 - 信息不足
logger.error('登录失败');
console.log(error);  // 不要使用 console.log 记录错误
```

---

## 四、函数设计规范 (Function Design)

### 4.1 函数长度

```javascript
// ✅ 正确 - 函数短小精悍
async function getUserById(id) {
  if (!id) return null;
  return await db.users.findById(id);
}

// ✅ 正确 - 长函数但职责单一且分段清晰
async function processOrder(orderData) {
  // 1. 验证输入
  const validationResult = validateOrderData(orderData);
  if (!validationResult.isValid) {
    throw new ValidationError(validationResult.errors);
  }

  // 2. 检查库存
  const inventoryStatus = await checkInventory(orderData.items);
  if (!inventoryStatus.available) {
    throw new InsufficientInventoryError(inventoryStatus.missingItems);
  }

  // 3. 创建订单
  const order = await createOrderRecord(orderData);

  // 4. 扣减库存
  await deductInventory(orderData.items);

  // 5. 发送通知
  await notifyUser(order.userId, '订单创建成功', order.id);

  return order;
}
```

### 4.2 参数设计

```javascript
// ❌ 错误 - 参数过多（超过4个）
function createUser(firstName, lastName, email, phone, address, city, country, age) {
  // ...
}

// ✅ 正确 - 使用对象参数
function createUser(userData) {
  const { firstName, lastName, email, phone, address, city, country, age } = userData;
  // ...
}

// 调用
createUser({
  firstName: '张',
  lastName: '三',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  address: '某某街道123号',
  city: '北京',
  country: '中国',
  age: 25
});
```

### 4.3 提前返回 (Guard Clauses)

```javascript
// ✅ 正确 - 提前返回减少嵌套
function calculateDiscount(order) {
  if (!order) return 0;
  if (order.total <= 0) return 0;
  if (!order.isMember) return 0;
  if (order.items.length === 0) return 0;

  // 主逻辑
  return order.total * 0.1;
}

// ❌ 错误 - 深层嵌套
function calculateDiscount(order) {
  if (order) {
    if (order.total > 0) {
      if (order.isMember) {
        if (order.items.length > 0) {
          return order.total * 0.1;
        }
      }
    }
  }
  return 0;
}
```

### 4.4 默认参数

```javascript
// ✅ 正确 - 使用默认参数
function fetchData(url, options = {}) {
  const {
    method = 'GET',
    timeout = 5000,
    retries = 3,
    headers = {}
  } = options;

  // ...
}

// 调用
fetchData('/api/users');  // 使用所有默认值
fetchData('/api/users', { timeout: 10000 });  // 覆盖特定选项
```

---

## 五、安全规范 (Security)

### 5.1 输入验证

```javascript
// ✅ 正确 - 严格验证所有输入
function createUser(userData) {
  // 类型检查
  if (typeof userData.email !== 'string') {
    throw new ValidationError('email 必须是字符串');
  }

  // 格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    throw new ValidationError('email 格式无效');
  }

  // 长度限制
  if (userData.name?.length > 100) {
    throw new ValidationError('name 不能超过100字符');
  }

  // 危险字符过滤
  const sanitizedName = sanitizeHtml(userData.name);

  // ...
}
```

### 5.2 敏感信息处理

```javascript
// ✅ 正确 - 敏感信息脱敏
function logUserAction(user, action) {
  logger.info('用户操作', {
    userId: user.id,
    action: action,
    // 脱敏处理
    email: maskEmail(user.email),  // z***@example.com
    phone: maskPhone(user.phone),  // 138****8000
    // 绝不记录密码、token等
  });
}

// ❌ 错误 - 泄露敏感信息
logger.info('用户登录', { 
  userId: user.id, 
  password: user.password,  // 严重错误！
  token: user.jwtToken      // 严重错误！
});
```

### 5.3 SQL 注入防护

```javascript
// ✅ 正确 - 使用参数化查询
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
const results = await db.query(query, [userId, 'active']);

// ❌ 错误 - 字符串拼接SQL
const query = `SELECT * FROM users WHERE id = '${userId}'`;
// 如果 userId = "1'; DROP TABLE users; --" 将导致数据丢失
```

---

## 六、性能规范 (Performance)

### 6.1 避免重复计算

```javascript
// ✅ 正确 - 缓存计算结果
function getHeavyComputedValue(input) {
  const cacheKey = `computed_${input}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = expensiveComputation(input);
  cache.set(cacheKey, result);
  
  return result;
}

// ❌ 错误 - 每次调用都重新计算
function getHeavyComputedValue(input) {
  return expensiveComputation(input);
}
```

### 6.2 异步操作优化

```javascript
// ✅ 正确 - 并行执行独立操作
async function loadDashboardData(userId) {
  const [user, orders, notifications] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchNotifications(userId)
  ]);

  return { user, orders, notifications };
}

// ❌ 错误 - 串行执行
async function loadDashboardData(userId) {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(userId);        // 等待user完成后才开始
  const notifications = await fetchNotifications(userId);  // 等待orders完成后才开始

  return { user, orders, notifications };
}
```

### 6.3 资源释放

```javascript
// ✅ 正确 - 确保资源释放
async function processFile(filePath) {
  const fileHandle = await fs.open(filePath, 'r');
  
  try {
    const content = await fileHandle.readFile();
    return processContent(content);
  } finally {
    await fileHandle.close();  // 确保关闭文件
  }
}

// ✅ 或使用现代语法
async function processFile(filePath) {
  await using fileHandle = await fs.open(filePath, 'r');
  const content = await fileHandle.readFile();
  return processContent(content);
  // 自动关闭
}
```

---

## 七、测试规范 (Testing)

### 7.1 单元测试规范

```javascript
// ✅ 正确 - 完整的测试用例
describe('UserService', () => {
  describe('getUserById', () => {
    it('应该返回存在的用户', async () => {
      const user = await userService.getUserById('valid-id');
      expect(user).toBeDefined();
      expect(user.id).toBe('valid-id');
    });

    it('应该返回 null 当用户不存在', async () => {
      const user = await userService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });

    it('应该抛出错误当 ID 无效', async () => {
      await expect(userService.getUserById(null))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### 7.2 测试覆盖要求

- 所有公共函数必须有测试
- 边界条件必须测试
- 错误路径必须测试
- 目标覆盖率: > 80%

---

## 八、文档规范 (Documentation)

### 8.1 README 规范

每个项目/模块必须包含：

```markdown
# 项目名称

## 简介
一句话描述项目用途

## 功能特性
- 特性1
- 特性2

## 安装
\`\`\`bash
npm install
\`\`\`

## 使用方法
\`\`\`javascript
// 代码示例
\`\`\`

## API 文档
[链接到详细文档]

## 贡献指南
如何参与贡献

## 许可证
MIT
```

### 8.2 变更日志 (CHANGELOG)

```markdown
## [1.2.0] - 2026-03-12

### 新增
- 添加用户认证功能
- 支持多种登录方式

### 修复
- 修复内存泄漏问题 (#123)
- 修复并发下的竞态条件

### 优化
- 提升查询性能 30%
```

---

## 九、检查清单 (Checklist)

### 代码提交前检查

- [ ] 代码可以正常运行
- [ ] 所有测试通过
- [ ] 没有 console.log（使用 logger）
- [ ] 没有 TODO/FIXME 遗留（或已记录 Issue）
- [ ] 错误处理完善
- [ ] 敏感信息已脱敏
- [ ] 函数长度 < 50 行
- [ ] 嵌套层级 < 3 层
- [ ] 命名清晰有意义
- [ ] 注释解释了"为什么"

### Code Review 检查

- [ ] 是否符合本规范
- [ ] 是否有更简单的方法
- [ ] 是否有潜在的错误
- [ ] 是否考虑了边界情况
- [ ] 是否有性能问题
- [ ] 是否有安全问题

---

## 十、规范执行

### 自动化检查工具

```json
{
  "eslintConfig": {
    "rules": {
      "max-lines-per-function": ["error", 50],
      "max-nested-callbacks": ["error", 3],
      "complexity": ["error", 10],
      "no-console": ["warn"]
    }
  }
}
```

### 代码审查流程

1. **自我审查** - 对照本规范检查
2. **自动化检查** - ESLint + 测试
3. **同行审查** - 至少 1 人审查
4. **合并前确认** - 所有检查通过

---

## 附录

### A. 推荐工具

| 工具 | 用途 |
|------|------|
| ESLint | 代码风格检查 |
| Prettier | 代码格式化 |
| Jest | 单元测试 |
| Husky | Git Hook 管理 |

### B. 学习资源

- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [JavaScript: The Good Parts](https://www.amazon.com/JavaScript-Good-Parts-Douglas-Crockford/dp/0596517742)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

### C. 更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0 | 2026-03-12 | 初始版本 |

---

**规范执行声明**: 本规范为强制执行标准，所有生成的代码必须符合以上要求。如有特殊情况需偏离规范，必须在注释中说明原因。
