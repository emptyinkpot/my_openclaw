# 自动化脚本项目

## 目录结构

```
workspace/
├── modules/                    # 通用模块库
│   └── website-automation/     # 网站自动化模块
│       ├── src/
│       │   ├── core/
│       │   │   └── automation.js    # 核心自动化类
│       │   ├── utils/
│       │   │   └── logger.js        # 日志工具
│       │   └── index.js             # 模块入口
│       ├── package.json
│       └── README.md
│
├── projects/                   # 项目脚本
│   ├── baimeng-writer/        # 白梦写作网自动化
│   │   ├── src/
│   │   │   ├── config.js
│   │   │   ├── main.js
│   │   │   └── handlers/
│   │   │       └── feishu.js
│   │   └── package.json
│   │
│   └── _template/             # 新项目模板
│
└── docs/                      # 文档
    ├── MODULE-SPECIFICATION.md   # 模块开发规范
    └── PROJECT-GUIDE.md          # 项目开发指南
```

## 快速开始

### 使用已有项目

```bash
# 白梦写作网
cd projects/baimeng-writer
node src/main.js login
```

### 创建新项目

```bash
# 复制模板
cp -r projects/_template projects/my-project

# 按照 PROJECT-GUIDE.md 开发
```

## 文档

- [模块开发规范](docs/MODULE-SPECIFICATION.md)
- [项目开发指南](docs/PROJECT-GUIDE.md)
