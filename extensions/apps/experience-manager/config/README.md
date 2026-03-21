# Experience Manager 配置

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| EXPERIENCE_PORT | 3002 | 服务端口 |
| EXPERIENCE_HOST | 0.0.0.0 | 服务主机 |
| EXPERIENCE_DATA_PATH | ./data/experiences.json | 数据文件路径 |
| NODE_ENV | development | 运行环境 |

## 配置示例

```bash
# 生产环境
export EXPERIENCE_PORT=3002
export EXPERIENCE_HOST=0.0.0.0
export EXPERIENCE_DATA_PATH=/var/lib/experience/data.json
export NODE_ENV=production
```
