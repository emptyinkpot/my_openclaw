# Atramenti-Console 部署运行手册

## 1. 文档目的

这份文档用于记录 Atramenti-Console 后续在云服务器上的部署、同步、启动、检查和维护流程。

目标是让以后做这些事情时，不需要重新摸索：

- 连接服务器
- 拉取代码
- 部署网站
- 部署 OpenClaw 或相关服务
- 检查服务状态
- 重启与回滚

## 2. 当前已知环境

### 本地信息

- 本地仓库：`E:\My Project\Atramenti-Console`
- GitHub 仓库：`https://github.com/emptyinkpot/Atramenti-Console.git`
- GitHub CLI：`C:\Users\ASUS-KL\tools\bin\gh.exe`

### 服务器信息

- 公网 IP：`124.220.233.126`
- 当前 SSH 用户：`ubuntu`
- SSH 登录命令：

```powershell
ssh ubuntu@124.220.233.126
```

### 当前结论

后续长期维护更推荐：

- 本地开发
- Git 提交与推送
- 服务器通过 SSH 拉最新代码并启动服务

而不是每次依赖远程桌面手工复制粘贴。

## 3. 推荐的长期部署思路

### 推荐模式

最稳妥的长期方式是：

1. 本地改代码
2. 提交到 Git 分支
3. 推送到 GitHub
4. 在服务器上 `git pull` 或重新拉取
5. 在服务器上安装依赖并重启服务

这种方式的优点：

- 不需要手工来回复制文件
- 变更有 Git 历史可追踪
- 回滚更简单
- 本地和云端始终围绕同一个仓库

### 不推荐模式

- 远程桌面手工拖文件
- 本地和云端各维护一套独立副本
- 把运行时缓存、数据库、临时文件一起同步到 Git

## 4. 第一次部署服务器的建议目录结构

在 Linux 服务器上，建议使用类似结构：

```text
/home/ubuntu/apps/Atramenti-Console
/home/ubuntu/apps/Atramenti-Console/releases
/home/ubuntu/apps/Atramenti-Console/shared
/home/ubuntu/logs
```

如果只做简单部署，也可以先直接用：

```text
/home/ubuntu/Atramenti-Console
```

## 5. 第一次把仓库拉到服务器

### 方式 A：直接 HTTPS 克隆

适合先快速跑起来。

```bash
git clone https://github.com/emptyinkpot/Atramenti-Console.git
cd Atramenti-Console
```

如果仓库需要认证，可能需要 token。

### 方式 B：配置 SSH key 后用 SSH 克隆

适合长期稳定使用。

```bash
git clone git@github.com:emptyinkpot/Atramenti-Console.git
cd Atramenti-Console
```

## 6. 服务器常见初始化步骤

以下是 Linux 服务器第一次部署常见准备动作。

### 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

### 安装 Git

```bash
sudo apt install -y git
```

### 安装 Node.js

如果项目需要 Node，可以使用 NodeSource 或 nvm。

简单方式示例：

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

### 检查版本

```bash
git --version
node -v
npm -v
```

## 7. 网站部署的一般流程

如果网站是前端项目，通常流程是：

1. 安装依赖
2. 构建生产版本
3. 使用 Web 服务对外提供访问

### 典型命令

```bash
npm install
npm run build
```

如果项目用的是 pnpm 或 bun，就替换为对应工具。

## 8. OpenClaw 部署的一般思路

### 本质理解

服务器就是一台不会随便关机的远程电脑。

所以如果要让 OpenClaw 在服务器上运行，通常意味着：

- OpenClaw 代码需要在服务器上存在
- OpenClaw 运行依赖需要在服务器上安装
- OpenClaw 的配置文件也要在服务器上可用
- 相关端口和服务需要由服务器自身托管

### 不是“只挂网关就万事大吉”

如果某个服务真的要在云端跑，它的：

- 代码
- 配置
- 依赖
- 运行时环境

最终都需要落在云端。

## 9. 网站和 OpenClaw 的推荐拆分方式

### 方案 A：全都在服务器

适合长期在线运行。

- 网站前端或管理界面部署在服务器
- OpenClaw 服务也部署在服务器
- 本地只负责开发和推代码

### 方案 B：网站在服务器，部分工具在本地

适合还在强开发期，且本地工具链依赖很重。

- 云端：对外网站、稳定接口、共享能力
- 本地：实验性脚本、浏览器自动化、重型开发环境

### 方案 C：本地开发，云端只跑稳定服务

这是目前最适合你的中间路线。

## 10. SSH 的典型用法

### 登录服务器

```powershell
ssh ubuntu@124.220.233.126
```

### 测试 22 端口

```powershell
Test-NetConnection 124.220.233.126 -Port 22
```

### 远程执行一条命令

```powershell
ssh ubuntu@124.220.233.126 "hostname"
```

### 拉取最新代码

```powershell
ssh ubuntu@124.220.233.126 "cd /home/ubuntu/Atramenti-Console && git pull"
```

## 11. 推荐的日常发布流程

### 本地发布流程

```powershell
git status
git add .
git commit -m "feat: 描述本次改动"
git push
```

### 服务器更新流程

```powershell
ssh ubuntu@124.220.233.126 "cd /home/ubuntu/Atramenti-Console && git pull"
ssh ubuntu@124.220.233.126 "cd /home/ubuntu/Atramenti-Console && npm install"
ssh ubuntu@124.220.233.126 "cd /home/ubuntu/Atramenti-Console && npm run build"
```

如果服务需要重启，再加重启命令。

## 12. 适合长期运行的启动方式

不要长期依赖“开一个终端窗口挂着”。

更稳的方式包括：

- `systemd`
- `pm2`
- `supervisor`
- 反向代理配合后台服务

### Node 服务常见方案：pm2

```bash
npm install -g pm2
pm2 start server.js --name atramenti-console
pm2 save
pm2 startup
```

### Linux 原生方案：systemd

适合更稳定、更规范的长期服务管理。

## 13. 为什么 Linux 更适合长期部署

相对 Windows，Linux 在服务器场景通常更适合：

- 更省资源
- 后台服务管理更自然
- SSH 工作流更成熟
- 自动化和脚本生态更强
- 远程部署体验通常更顺手

这也是为什么后面重装到 Linux 是一条更轻松的路。

## 14. 什么时候仍然可能需要 Windows

如果未来某些工具链只能在 Windows 上稳定运行，例如：

- 特定浏览器自动化依赖
- 某些桌面程序耦合
- 特定驱动或图形环境要求

那就可以把这些能力保留在本地 Windows，云端只放稳定服务。

## 15. 常见故障排查

### 15.1 `ssh: connect to host ... port 22: Connection timed out`

排查方向：

- 服务器 SSH 服务是否启动
- 防火墙是否放行 22 端口
- 云平台安全组是否允许 22 端口
- 本地网络是否能访问目标服务器

### 15.2 `REMOTE HOST IDENTIFICATION HAS CHANGED`

说明服务器系统重装后，主机指纹变了。

处理方式：

```powershell
ssh-keygen -R 124.220.233.126
```

然后重新连接确认新指纹。

### 15.3 服务启动了但网页很卡

排查方向：

- 服务器 CPU / 内存是否不足
- 是否直接裸跑开发服务器
- 是否缺少反向代理和静态资源优化
- 带宽是否太低
- 应用是否本身在 debug / dev 模式运行

### 15.4 contributors 页面显示异常

优先用 GitHub API 验证真实结果，而不是只看网页缓存。

## 16. 安全建议

### GitHub 侧

- 高权限 token 尽快替换成最小权限 token
- 避免永久不过期 token
- 尽量不要把 token 发到聊天、截图或文档里

### 服务器侧

- 尽量使用 SSH key 登录
- 定期更新系统
- 不要把敏感配置直接提交进 Git 仓库
- 配置服务时区分：
  - 代码
  - 配置
  - 日志
  - 数据

## 17. 推荐后续补充的文档

后续还可以继续补成三份独立文档：

- `SERVER-BOOTSTRAP.md`
  - 服务器从零初始化
- `OPENCLAW-RUNBOOK.md`
  - OpenClaw 的具体启动与排障
- `RELEASE-CHECKLIST.md`
  - 每次发布前后的检查清单

## 18. 常用命令备忘

### 本地查看 Git 状态

```powershell
git status --short --branch
```

### 查看当前 PR

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' pr view 1
```

### 更新 PR 描述

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' pr edit 1 --title "新标题" --body-file pr_body.md
```

### 用 API 查询 contributors

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' api repos/emptyinkpot/Atramenti-Console/contributors
```

### SSH 登录服务器

```powershell
ssh ubuntu@124.220.233.126
```

### 远程执行命令

```powershell
ssh ubuntu@124.220.233.126 "hostname"
```

## 19. 一句话总结

以后最理想的节奏是：本地开发，GitHub 承载版本与 PR，服务器通过 SSH 拉代码并运行服务，所有高风险权限尽量最小化，所有重复动作尽量文档化和脚本化。
