# 小说数据格式规范文档

## 数据库表结构总览

| 表名 | 用途 | 记录数 |
|------|------|--------|
| `works` | 作品基本信息 | 1 |
| `chapters` | 章节内容 | 119 |
| `volume_outlines` | 卷纲/分卷大纲 | 5 |
| `chapter_outlines` | 章节大纲 | 189 |
| `characters` | 角色信息 | 13 |
| `core_relationships` | 核心人物关系 | 0 |
| `world_settings` | 世界观设定 | 1 |
| `publish_logs` | 发布记录 | 0 |

---

## 1. works（作品表）

作品基础信息，**每部作品一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键，作品唯一ID |
| `title` | varchar(200) | ✅ | 作品主标题 |
| `alternative_titles` | text | ❌ | 副标题/别名，JSON数组格式 |
| `description` | longtext | ❌ | 作品简介/简介 |
| `tags` | text | ❌ | 标签，JSON数组格式 |
| `style` | text | ❌ | 写作风格描述 |
| `target_chapters` | int | ❌ | 目标章节数，默认0 |
| `current_chapters` | int | ❌ | 当前章节数，默认0 |
| `status` | varchar(50) | ❌ | 状态：`draft`/`ongoing`/`completed` |
| `platform` | varchar(100) | ❌ | 发布平台，如`fanqie`/`baimeng` |
| `created_at` | datetime | 自动 | 创建时间 |
| `updated_at` | datetime | 自动 | 更新时间 |

### 示例数据

```json
{
  "id": 1,
  "title": "我的绑定恋人是病娇？？",
  "alternative_titles": "[\"第四天国：我的绑定恋人是病娇\"]",
  "description": "《第四天国：我的绑定恋人是病娇》...",
  "tags": "[\"性转\",\"百合\",\"净化\",\"病娇\",\"约\"]",
  "style": "轻小说风、轻松幽默、擦边软色情轻百合性转",
  "target_chapters": 200,
  "current_chapters": 119,
  "status": "ongoing",
  "platform": null
}
```

---

## 2. chapters（章节表）

章节正文内容，**每章节一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `chapter_number` | int | ✅ | 章节序号（从1开始） |
| `title` | varchar(200) | ❌ | 章节标题 |
| `content` | longtext | ❌ | 章节正文 |
| `word_count` | int | ❌ | 字数统计，默认0 |
| `status` | varchar(50) | ❌ | 状态：`draft`/`published`/`archived` |
| `created_at` | datetime | 自动 | 创建时间 |
| `updated_at` | datetime | 自动 | 更新时间 |

### 示例数据

```json
{
  "id": 1,
  "work_id": 1,
  "chapter_number": 1,
  "title": "序章：觉醒",
  "content": "正文内容...",
  "word_count": 3250,
  "status": "published"
}
```

---

## 3. volume_outlines（卷纲表）

分卷大纲，**每卷一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `volume_number` | int | ✅ | 卷序号（从1开始） |
| `volume_title` | varchar(200) | ❌ | 卷标题 |
| `volume_core` | text | ❌ | 卷核心主题/一句话总结 |
| `chapter_range` | varchar(50) | ❌ | 章节范围，格式：`1-40` |
| `main_content` | text | ❌ | 卷主要内容描述 |
| `start_status` | text | ❌ | 卷开始状态 |
| `end_status` | text | ❌ | 卷结束状态 |
| `created_at` | datetime | 自动 | 创建时间 |

### 示例数据

```json
{
  "id": 1,
  "work_id": 1,
  "volume_number": 1,
  "volume_title": "第一卷：觉醒",
  "volume_core": "主角觉醒天使血脉，卷入天使与人类的冲突",
  "chapter_range": "1-40",
  "main_content": "描述第一卷的主要内容...",
  "start_status": "普通高中生林恩",
  "end_status": "觉醒为天使莉娜-艾尔"
}
```

---

## 4. chapter_outlines（章节大纲表）

章级细纲，**每章一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `volume_number` | int | ❌ | 所属卷号 |
| `chapter_number` | int | ✅ | 章节序号 |
| `title` | varchar(200) | ❌ | 章节标题 |
| `plot_summary` | text | ❌ | 情节摘要 |
| `main_scenes` | text | ❌ | 主要场景描述 |
| `characters` | text | ❌ | 出场角色 |
| `plot_function` | text | ❌ | 情节功能（起承转合） |
| `emotion_tone` | text | ❌ | 情感基调 |
| `created_at` | datetime | 自动 | 创建时间 |

### 示例数据

```json
{
  "id": 1,
  "work_id": 1,
  "volume_number": 1,
  "chapter_number": 1,
  "title": "序章：觉醒",
  "plot_summary": "主角林恩觉醒天使血脉...",
  "main_scenes": "学校天台、家中卧室",
  "characters": "林恩/莉娜-艾尔",
  "plot_function": "起：引入主角日常",
  "emotion_tone": "悬疑、紧张"
}
```

---

## 5. characters（角色表）

角色信息，**每个角色一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `name` | varchar(100) | ✅ | 角色名 |
| `role_type` | varchar(50) | ❌ | 角色类型（见下表） |
| `description` | text | ❌ | 角色描述/简介 |
| `created_at` | datetime | 自动 | 创建时间 |

### role_type 枚举值

| 值 | 含义 | 说明 |
|----|------|------|
| `protagonist` | 主角 | 第一主角 |
| `main` | 主要角色 | 重要配角 |
| `supporting` | 配角 | 次要角色 |
| `antagonist` | 反派 | 主要反派 |
| `villain` | 反派 | 同antagonist |

### 示例数据

```json
{
  "id": 1,
  "work_id": 1,
  "name": "莉娜-艾尔",
  "role_type": "protagonist",
  "description": "原为体弱多病的高中男生林恩，性转后变成金发萝莉天使混血。吐槽役，扮猪吃虎。"
}
```

---

## 6. core_relationships（核心关系表）

人物关系，**每对关系一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `character_a` | varchar(100) | ✅ | 角色A |
| `character_b` | varchar(100) | ✅ | 角色B |
| `relationship_type` | varchar(100) | ❌ | 关系类型 |
| `emotion_mode` | text | ❌ | 情感模式 |
| `description` | text | ❌ | 关系描述 |
| `created_at` | datetime | 自动 | 创建时间 |

### 示例数据

```json
{
  "id": 1,
  "work_id": 1,
  "character_a": "莉娜-艾尔",
  "character_b": "米迦勒-苏",
  "relationship_type": "恩典之约",
  "emotion_mode": "病娇占有欲",
  "description": "被强制绑定的恋人关系"
}
```

---

## 7. world_settings（世界观设定表）

世界观设定，**每个设定一条记录**。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `setting_type` | varchar(100) | ❌ | 设定类型 |
| `title` | varchar(200) | ❌ | 设定标题 |
| `content` | longtext | ❌ | 设定内容 |
| `examples` | text | ❌ | 示例 |
| `created_at` | datetime | 自动 | 创建时间 |

### setting_type 建议值

- `world_background` - 世界背景
- `power_system` - 力量体系
- `organization` - 组织势力
- `terminology` - 术语解释
- `geography` - 地理设定
- `history` - 历史背景

### 示例数据

```json
{
  "id": 1,
  "work_id": 1,
  "setting_type": "power_system",
  "title": "天使血脉体系",
  "content": "天使分为炽天使、智天使、主天使等等级...",
  "examples": "米迦勒-苏为炽天使，拉斐尔-孟为智天使"
}
```

---

## 8. publish_logs（发布记录表）

发布历史记录。

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | int | 自增 | 主键 |
| `work_id` | int | ✅ | 关联作品ID |
| `chapter_number` | int | ❌ | 章节号 |
| `platform` | varchar(50) | ❌ | 平台：`fanqie`/`baimeng` |
| `status` | varchar(50) | ❌ | 状态：`success`/`failed` |
| `message` | text | ❌ | 消息/错误信息 |
| `published_at` | datetime | 自动 | 发布时间 |

---

## 数据导入建议

### 导入顺序

```
1. works（作品）
2. characters（角色）
3. core_relationships（关系）
4. world_settings（世界观）
5. volume_outlines（卷纲）
6. chapter_outlines（章纲）
7. chapters（正文）
```

### JSON数组字段格式

```json
// alternative_titles
["副标题1", "副标题2"]

// tags  
["标签1", "标签2", "标签3"]
```

### 注意事项

1. **work_id** 必须对应有效的作品ID
2. **chapter_number** 必须唯一（在同一work_id下）
3. **status** 字段使用英文小写枚举值
4. **JSON字段** 必须使用双引号，符合JSON规范
5. **时间字段** 会自动生成，无需手动设置
