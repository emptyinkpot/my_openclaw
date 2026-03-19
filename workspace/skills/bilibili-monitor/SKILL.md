# B站舆情监控 Skill

## 功能

- 📺 **UP主监控**: 跟踪UP主新视频发布
- 📊 **视频分析**: 播放量、点赞、评论趋势
- 💬 **评论舆情**: 情感分析、关键词提取
- 🔔 **实时告警**: 负面舆情自动通知
- 📈 **数据报表**: 生成统计报告

## 使用方式

### 1. 监控UP主
```
监控B站UP主 UID:123456
```

### 2. 分析视频
```
分析B站视频 BV:BV1xx411c7mD
```

### 3. 舆情报告
```
生成B站舆情报告
```

## 配置

在 `config.json` 中设置：
- `sessdata`: B站登录凭证（可选，用于获取更完整数据）
- `monitor_interval`: 监控间隔（秒）
- `alert_threshold`: 告警阈值

## 数据存储

SQLite数据库: `data/monitor.db`

表结构：
- `up_monitors`: 监控的UP主列表
- `videos`: 视频数据
- `comments`: 评论数据
- `sentiment_reports`: 舆情报告
