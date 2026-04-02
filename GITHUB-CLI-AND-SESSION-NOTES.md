# Atramenti-Console 运维与 GitHub 操作手册

## 1. 文档目的

这份文档用于沉淀这次会话中已经验证过的操作经验，方便后续在以下场景中直接复用：

- 本地 Git 仓库维护
- GitHub CLI 使用
- GitHub PR 操作
- GitHub token 安全管理
- SSH 远程登录与服务器运维
- 遇到 contributors、登录失败、PR 冲突时的排查

## 2. 当前环境概览

### 本地仓库

- 仓库根目录：`E:\My Project\Atramenti-Console`
- 远端仓库：`https://github.com/emptyinkpot/Atramenti-Console.git`
- 当前已建立的集成分支：`integration/merge-to-main`
- 当前 PR：`https://github.com/emptyinkpot/Atramenti-Console/pull/1`

### GitHub CLI

- `gh.exe` 路径：`C:\Users\ASUS-KL\tools\bin\gh.exe`
- 当前 GitHub 登录账号：`emptyinkpot`
- Git 协议：`https`

### 云服务器

- 公网 IP：`124.220.233.126`
- 当前已启用 SSH 远程接入
- 当前更适合使用 SSH 做命令行维护，而不是只依赖远程桌面

## 3. 这次会话完成了什么

本次实际完成的工作包括：

- 把本地工程整理为单一根 Git 仓库
- 清理了嵌套 Git 仓库残留
- 创建并推送了 `integration/merge-to-main`
- 处理了本地 bootstrap 线并入 `main` 时出现的 26 个 add/add 冲突
- 清理了明显不应该进入主仓库的本地运行残留
- 安装并登录了 GitHub CLI
- 创建并更新了 PR
- 调用 GitHub API 验证 contributors 真实数据
- 把相关知识点沉淀成文档

## 4. gh 是什么

`gh` 是 GitHub CLI，也就是 GitHub 官方命令行工具。

它的作用是：

- 直接在终端里操作 GitHub
- 避免频繁打开网页手动点击
- 适合自动化、脚本化、批量化处理 GitHub 事务

### 常见用途

- 登录 GitHub
- 创建、查看、编辑 PR
- 查看与操作 issue
- 查询仓库与发布信息
- 调用 GitHub API
- 管理 workflow、release、discussion 等

### 这次用到的具体用途

- 登录 GitHub 账号
- 检查 PR 是否存在
- 更新 PR 标题与正文
- 查询 contributors 真实结果

## 5. GitHub token 是什么

GitHub token 可以理解为“给程序使用的密码”。

命令行工具、自动化脚本和 API 请求不能每次都靠浏览器手动登录，所以 GitHub 提供 token 作为身份凭证。

这次使用的是：

- `Personal access token (classic)`

它的作用是：

- 让 `gh` 能代表账号执行 GitHub 操作
- 让程序调用 GitHub API
- 执行仓库级操作，例如 PR、issue、workflow 等

## 6. token 的 scopes 是什么

`scopes` 是 token 的权限范围。

不同 scope 代表不同权限能力。

### 常见 scope 含义

- `repo`：仓库读写、PR、issue、分支等核心仓库能力
- `workflow`：GitHub Actions 工作流管理
- `admin:org`：组织级管理权限，风险高
- `admin:public_key`：管理 SSH 公钥
- `write:packages`：上传包到 GitHub Packages
- `delete_repo`：删除仓库，风险很高

### 本次风险点

这次最终登录使用的是一个：

- 高权限 token
- `No expiration`

这类配置的风险非常高。

## 7. token 安全建议

### 不应该做的事

- 不要把 token 发到聊天里
- 不要在截图里暴露 token
- 不要把 token 写进代码或配置文件
- 不要提交到 Git 仓库
- 不要长期使用全权限、永不过期 token

### 建议做法

- 优先使用最小权限 token
- 一般仓库协作优先给：`repo`
- 需要管理 workflow 再补：`workflow`
- 管理员类权限按需再开，不要预先全开
- 重要 token 建议设置过期时间
- 如果 token 已经泄露，立即撤销并重建

### 当前建议动作

由于本次 token 已经明文暴露，建议后续尽快：

1. 到 GitHub Developer Settings 撤销当前 token
2. 重新生成一个新的 token
3. 只保留真正需要的权限

## 8. PR 是什么

PR 全称是 Pull Request。

它的作用是：

- 把一个分支的改动申请合并到另一个分支
- 在合并前先做审查和说明
- 留下可追踪的协作记录

### 本次 PR 信息

- 源分支：`integration/merge-to-main`
- 目标分支：`main`
- PR 地址：`https://github.com/emptyinkpot/Atramenti-Console/pull/1`

### 本次 PR 的意义

这不是普通的小修小补，而是一次历史整合 PR。

它的作用是：

- 把本地 bootstrap 线正式接入 `main`
- 解决无共同祖先历史的问题
- 为后续统一开发建立基础

## 9. 这次合并解决了什么问题

本次合并前，存在以下情况：

- `origin/main` 与本地 bootstrap 分支没有共同 merge base
- 两边历史互相独立
- 合并时出现 26 个 add/add 冲突

### 冲突主要集中于

- 根目录配置文件
- 启动脚本
- `projects/extensions/vscode-key-guard/*`

### 最终处理策略

- 建立专门的安全集成分支 `integration/merge-to-main`
- 解决冲突后提交 merge commit
- 把本地 bootstrap 线作为主要保留版本
- 推送并创建 PR

## 10. contributors 页面与 API 结果不一致的原因

曾经在网页上看到 contributors 中出现：

- `emptyinkpot`
- `codex`

但通过 GitHub API 查询真实 contributors 后，结果只有：

- `emptyinkpot`

这说明：

- 网页 contributors 页面可能存在缓存
- 前端页面刷新可能滞后于 API 真实结果
- 页面统计并不一定等于当前真实 contributors 状态

### 当前结论

- 目前无需为了清理 `codex` 去改写 Git 历史
- 先等待 GitHub 页面刷新更合理

## 11. 为什么要清理本地残留目录

这次加入 `.gitignore` 或清理索引的内容包括：

- `.runtime/`
- `.trash/`
- `tmp/`
- `.vscode/settings.json`
- 部分恢复状态、记忆日志、环境文件

这些内容通常属于：

- 本地缓存
- 编辑器私有设置
- 临时文件
- 运行状态产物
- 不可复用的机器本地信息

把它们保留在主仓库里，会带来：

- 历史污染
- 协作者环境不一致
- 难以区分真正代码变更与临时产物

## 12. SSH 在整套流程里的意义

SSH 是服务器长期维护的重要入口。

相比一直依赖远程桌面，SSH 更适合：

- 自动化部署
- 执行命令
- 拉取代码
- 启动/停止服务
- 查看日志
- 批量处理运维动作

### 本次已经做过的事情

- 安装并启用 OpenSSH Server
- 启动 `sshd`
- 放行 22 端口
- 配置密钥登录
- 成功从本机通过 SSH 连接服务器

## 13. 推荐的长期工作流

### 本地开发

1. 本地改代码
2. 提交到 Git 分支
3. 推送到 GitHub
4. 用 PR 合入 `main`

### 云端运维

1. 用 SSH 登录服务器
2. 在服务器上拉最新代码
3. 安装依赖或重启服务
4. 检查日志和健康状态

### GitHub 协作

1. 用 `gh` 或网页创建 PR
2. 补充清晰标题和正文
3. 合并后再做第二轮仓库清理

## 14. 常见问题与排查

### 14.1 `gh auth login` 浏览器登录超时

可能原因：

- 到 GitHub 设备认证接口的网络超时

处理方式：

- 改用 token 登录：

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' auth login --with-token
```

### 14.2 GitHub 页面 contributors 显示异常

排查方式：

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' api repos/emptyinkpot/Atramenti-Console/contributors
```

如果 API 正常，而页面不正常，优先判断为页面缓存。

### 14.3 Git 报 `index.lock` 存在

原因通常是：

- 上一次 Git 命令中断
- 某个 Git 进程未正常退出

处理方式：

- 确认没有 Git 正在运行
- 删除 `.git\index.lock`

### 14.4 出现 add/add 冲突

说明两边都新增了同一路径的文件。

处理思路：

- 先识别哪一边应该作为主版本
- 再逐个确认冲突文件
- 解完后 `git add` 标记已解决
- 最后提交 merge commit

## 15. 常用命令备忘

### 查看 Git 状态

```powershell
git status --short --branch
```

### 查看最近提交

```powershell
git log --oneline --decorate -n 10
```

### 查看远端

```powershell
git remote -v
```

### 查看 gh 登录状态

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' auth status
```

### 查看 PR

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' pr view 1
```

### 更新 PR 标题和正文

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' pr edit 1 --title "新标题" --body-file pr_body.md
```

### 查询 contributors

```powershell
& 'C:\Users\ASUS-KL\tools\bin\gh.exe' api repos/emptyinkpot/Atramenti-Console/contributors
```

### SSH 登录服务器

```powershell
ssh ubuntu@124.220.233.126
```

### 测试服务器 SSH 可达性

```powershell
Test-NetConnection 124.220.233.126 -Port 22
```

## 16. 后续建议

建议接下来按这个顺序继续：

1. 处理当前高权限 token 的安全问题
2. 合并 PR 到 `main`
3. 对仓库做第二轮瘦身和结构整理
4. 把服务器部署、拉代码、启动服务流程再单独沉淀成一份部署手册

## 17. 一句话总结

这次已经把本地仓库、GitHub PR、CLI 工具、SSH 运维入口打通了，后续重点不再是“能不能做”，而是把权限、安全和流程继续收敛到更稳定、更可重复的一套操作方式。
