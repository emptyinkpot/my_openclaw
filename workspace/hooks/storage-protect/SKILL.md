# Storage Protect Skill

安全删除和恢复 storage 目录中的重要数据。

## 功能

- 🔒 保护重要数据路径（accounts、browser-data 等）
- 🗑️ 安全删除：移入回收站而非直接删除
- ♻️ 恢复功能：从回收站恢复误删数据
- 🧹 自动清理：定期清理过期回收站（默认保留 30 天）

## 受保护路径

| 路径 | 说明 | 关键性 |
|------|------|--------|
| `accounts/` | 所有平台账户信息（cookies、登录状态） | 关键 |
| `baimeng/browser-data/` | 白梦浏览器登录数据 | 关键 |
| `fanqie/` | 番茄小说账户数据 | 关键 |

## 用法

```bash
# 显示保护状态
bash /workspace/projects/auto-scripts/scripts/flows/storage-protect.sh status

# 安全删除（受保护路径自动移入回收站）
bash /workspace/projects/auto-scripts/scripts/flows/storage-protect.sh delete <path>

# 列出回收站内容
bash /workspace/projects/auto-scripts/scripts/flows/storage-protect.sh list

# 从回收站恢复
bash /workspace/projects/auto-scripts/scripts/flows/storage-protect.sh restore <trash-id>

# 清理过期回收站
bash /workspace/projects/auto-scripts/scripts/flows/storage-protect.sh cleanup
```

## 元数据

```json
{
  "name": "storage-protect",
  "version": "1.0.0",
  "description": "安全删除和恢复 storage 目录中的重要数据",
  "triggers": ["delete storage", "restore data", "保护数据", "恢复数据"]
}
```
