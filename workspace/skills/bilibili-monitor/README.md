# B站舆情监控 Skill

🎬 **实时批量爬取B站视频舆情，集成到OpenClaw**

## 功能特性

- 📺 **UP主监控**: 自动跟踪UP主新视频发布
- 📊 **视频分析**: 播放量、点赞、评论统计
- 💬 **评论舆情**: 情感分析、关键词提取、热度计算
- 🔔 **实时告警**: 负面舆情自动通知
- 📈 **数据报表**: 生成详细的舆情报告

## 技术栈

- **Python**: bilibili-api-python, jieba, aiosqlite
- **Node.js/TypeScript**: OpenClaw Skill接口
- **SQLite**: 本地数据存储

## 目录结构

```
bilibili-monitor/
├── index.ts              # OpenClaw入口
├── SKILL.json            # Skill配置
├── SKILL.md              # Skill文档
├── lib/
│   ├── bilibili_api.py   # B站API封装
│   ├── sentiment_analyzer.py  # 舆情分析
│   └── database.py       # 数据库操作
├── scripts/
│   ├── skill_runner.py   # Skill执行脚本
│   ├── monitor_daemon.py # 监控守护进程
│   └── setup.sh          # 安装脚本
└── data/
    └── monitor.db        # SQLite数据库
```

## 安装

```bash
cd /workspace/projects/workspace/skills/bilibili-monitor
bash scripts/setup.sh
```

或者手动安装:

```bash
pip3 install bilibili-api-python jieba aiosqlite aiohttp
python3 scripts/skill_runner.py init
```

## 使用方式

### 1. 飞书/命令行调用

```
# 分析视频舆情
分析B站视频 BV:BV1xx411c7mD

# 添加UP主监控
监控B站UP主 UID:123456

# 查看监控列表
列出B站监控

# 获取舆情报告
生成B站舆情报告

# 查看告警
查看B站告警
```

### 2. OpenClaw API调用

```typescript
import { analyze_video, monitor_up, get_reports, get_alerts } from './skills/bilibili-monitor';

// 分析视频
const report = await analyze_video("BV1xx411c7mD");

// 添加监控
await monitor_up("123456", "UP主名称");

// 获取报告
const reports = await get_reports(5);

// 获取告警
const alerts = await get_alerts();
```

### 3. 命令行直接使用

```bash
# 初始化数据库
python3 scripts/skill_runner.py init

# 分析视频
python3 scripts/skill_runner.py analyze BV1xx411c7mD

# 添加监控
python3 scripts/skill_runner.py monitor 123456 "UP主名称"

# 列出监控
python3 scripts/skill_runner.py list

# 获取报告
python3 scripts/skill_runner.py reports 10

# 查看告警
python3 scripts/skill_runner.py alerts
```

### 4. 启动监控守护进程

```bash
# 守护进程模式（每5分钟检查一次）
python3 scripts/monitor_daemon.py

# 自定义检查间隔（10分钟）
python3 scripts/monitor_daemon.py --interval 600

# 单次执行
python3 scripts/monitor_daemon.py --once
```

## 舆情分析算法

### 情感分析

基于词典的规则匹配:
- 正面词: 好、棒、赞、优秀、精彩、喜欢...
- 负面词: 差、烂、糟、垃圾、恶心...
- 程度副词: 很(1.5x)、非常(2x)、有点(0.6x)...
- 否定词: 不、没、无...

输出: 情感得分 (-1到1), 标签 (positive/negative/neutral)

### 关键词提取

使用jieba的TF-IDF算法，提取评论中的关键词。

### 告警级别

| 级别 | 条件 |
|------|------|
| 🔴 High | 负面评论比例 > 30% 或 情感得分 < -0.5 |
| 🟡 Medium | 负面评论比例 > 15% 或 情感得分 < -0.2 |
| 🟢 Low | 负面评论比例 > 5% |
| ⚪ None | 其他情况 |

## 数据库结构

### 表: up_monitors
存储监控的UP主信息

| 字段 | 说明 |
|------|------|
| mid | UP主UID |
| name | UP主名称 |
| check_interval | 检查间隔(秒) |
| last_check_time | 最后检查时间 |
| is_active | 是否活跃 |

### 表: videos
存储视频信息

| 字段 | 说明 |
|------|------|
| bvid | 视频BV号 |
| title | 标题 |
| view_count | 播放量 |
| like_count | 点赞数 |
| reply_count | 评论数 |
| analyzed | 是否已分析 |

### 表: comments
存储评论数据

| 字段 | 说明 |
|------|------|
| rpid | 评论ID |
| bvid | 所属视频 |
| uname | 用户名 |
| content | 内容 |
| sentiment_score | 情感得分 |
| sentiment_label | 情感标签 |

### 表: sentiment_reports
存储舆情报告

| 字段 | 说明 |
|------|------|
| bvid | 视频BV号 |
| overall_sentiment | 整体情感 |
| sentiment_score | 情感得分 |
| hot_keywords | 热门关键词(JSON) |
| warning_level | 告警级别 |

### 表: alerts
存储告警信息

| 字段 | 说明 |
|------|------|
| bvid | 相关视频 |
| alert_type | 告警类型 |
| alert_level | 告警级别 |
| message | 告警消息 |
| is_read | 是否已读 |

## API参考

### BilibiliAPI 类

```python
async with BilibiliAPI() as api:
    # 获取视频信息
    info = await api.get_video_info("BV1xx411c7mD")
    
    # 获取字幕
    subtitle = await api.get_video_subtitle("BV1xx411c7mD")
    
    # 获取评论
    comments = await api.get_comments("BV1xx411c7mD", page=1)
    
    # 获取UP主视频
    videos = await api.get_up_videos(123456, page=1)
    
    # 获取UP主信息
    up_info = await api.get_up_info(123456)
```

### PublicOpinionAnalyzer 类

```python
analyzer = PublicOpinionAnalyzer()

# 分析视频评论
report = analyzer.analyze_video_comments(video_info, comments)

# 生成报告文本
text = analyzer.generate_report_text(report)
```

## 注意事项

1. **B站API限制**: 未登录状态有请求频率限制，建议添加 `sessdata` 以获取更完整数据
2. **评论数量**: 默认只获取前50条评论进行分析，可以修改 `page_size` 参数
3. **情感分析**: 基于规则的简单实现，复杂语境可能不准确
4. **存储空间**: 长期监控会占用较多存储空间，定期清理旧数据

## 扩展建议

1. **接入LLM**: 使用大模型进行更准确的情感分析和内容总结
2. **可视化**: 添加舆情趋势图表
3. **多平台**: 扩展到抖音、快手等平台
4. **告警通知**: 集成飞书/钉钉机器人实时推送告警

## 开源依赖

- [bilibili-api-python](https://github.com/Nemo2011/bilibili-api) - B站API封装
- [jieba](https://github.com/fxsjy/jieba) - 中文分词
- [aiosqlite](https://github.com/omnilib/aiosqlite) - 异步SQLite

## License

MIT
