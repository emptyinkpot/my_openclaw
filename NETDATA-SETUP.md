# Atramenti-Console Netdata 接入手册

## 1. 文档目的

这份文档用于说明如何在 Linux 服务器上安装 Netdata，并用它可视化查看：

- CPU、内存、磁盘、网络
- 进程运行状态
- 端口和 socket 活跃情况
- 服务资源占用情况

这份手册的目标不是做复杂监控平台，而是先让你快速“看清服务器现在到底在跑什么”。

## 2. 为什么先用 Netdata

对于当前 Atramenti-Console 的阶段，Netdata 的优势是：

- 上手快
- 安装轻量
- 不需要先对应用做大改造
- 非常适合单机服务器起步
- 能直接看到机器、进程、网络和端口活动

它最适合回答的问题：

- 哪个服务在占 CPU
- 哪个进程内存高
- 哪个端口正在活跃
- 当前网络吞吐高不高
- 服务器是不是扛不住了

## 3. 适合部署在哪

推荐直接部署在你的 Linux 云服务器上。

也就是：

- 网站跑在服务器上
- OpenClaw 或相关服务跑在服务器上
- Netdata 也跑在同一台服务器上

这样 Netdata 才能看到最真实的系统状态。

## 4. 安装前准备

先通过 SSH 登录服务器：

```powershell
ssh ubuntu@124.220.233.126
```

更新系统：

```bash
sudo apt update
sudo apt upgrade -y
```

## 5. 官方推荐安装方式

Netdata 官方通常推荐用一键安装脚本。

常见方式：

```bash
wget -O /tmp/netdata-kickstart.sh https://get.netdata.cloud/kickstart.sh
sh /tmp/netdata-kickstart.sh
```

如果机器没有 `wget`，可以先安装：

```bash
sudo apt install -y wget
```

也可以使用 `curl`：

```bash
curl -fsSL https://get.netdata.cloud/kickstart.sh -o /tmp/netdata-kickstart.sh
sh /tmp/netdata-kickstart.sh
```

## 6. 安装完成后怎么访问

Netdata 默认常见端口是：

- `19999`

如果服务器已经开放该端口，可以直接在浏览器访问：

```text
http://124.220.233.126:19999
```

## 7. 如果访问不到怎么办

优先排查以下几件事。

### 7.1 检查 Netdata 服务是否启动

```bash
sudo systemctl status netdata
```

### 7.2 检查端口是否监听

```bash
sudo ss -lntp | grep 19999
```

### 7.3 检查云平台防火墙 / 安全组

需要确保入站允许：

- TCP 19999

### 7.4 检查本机可达性

在你本地 PowerShell 可以测试：

```powershell
Test-NetConnection 124.220.233.126 -Port 19999
```

## 8. 最重要的几个页面先看什么

Netdata 面板很多，不需要一开始全看。

建议先看：

- CPU
- Memory
- Disk
- Network
- Processes
- Systemd services
- Sockets / network connections

## 9. 你最关心的“端口和服务”怎么看

虽然 Netdata 不是专门的“端口关系图”工具，但你可以通过这些维度判断：

### 9.1 进程视角

看：

- 哪个进程在运行
- 哪个进程资源占用高
- 哪个服务突然飙升

### 9.2 网络连接视角

看：

- 当前连接数
- 入站/出站流量
- 活跃 socket

### 9.3 配合系统命令补充

Netdata 负责可视化，终端命令负责精确确认。

例如：

```bash
sudo ss -lntp
```

它可以直接显示：

- 监听端口
- 对应进程

如果想看某个端口：

```bash
sudo ss -lntp | grep 5000
```

## 10. 推荐的组合方式

最实用的做法不是“只看 Netdata”，而是：

- Netdata 看全局可视化
- `ss` / `systemctl` / `journalctl` 做精确诊断

### 服务状态

```bash
sudo systemctl status <service-name>
```

### 查看日志

```bash
sudo journalctl -u <service-name> -n 200 --no-pager
```

### 查看端口

```bash
sudo ss -lntp
```

## 11. 是否应该直接公网暴露 19999

不太建议长期裸露在公网。

更稳的方式包括：

- 只在安全组里给自己的 IP 放行
- 通过 SSH 隧道访问
- 或者以后用反向代理并做鉴权

### SSH 隧道方式

在本地 PowerShell：

```powershell
ssh -L 19999:127.0.0.1:19999 ubuntu@124.220.233.126
```

然后本地浏览器打开：

```text
http://127.0.0.1:19999
```

这样更安全。

## 12. 对 Atramenti-Console 最实用的观察点

如果你后续把网站、OpenClaw、网关等放到同一台机器上，建议重点观察：

- 总 CPU 占用是否持续过高
- 内存是否接近打满
- 某个 Node / Python / 其他服务是否异常膨胀
- 网络出流量是否异常
- 重启后服务是否恢复正常
- 某个端口服务是否频繁断连或卡死

## 13. 能不能把 Netdata 相关能力做成项目里的一个扩展模块

可以，而且很适合做成一个“观测中心”扩展，但推荐方式不是把 Netdata 本身重写到项目里，而是：

- Netdata 继续作为服务器上的独立观测服务
- Atramenti-Console 在 `projects/extensions` 下做一个扩展模块
- 扩展模块负责：
  - 聚合展示 Netdata 数据
  - 补充端口、服务、依赖关系 UI
  - 统一接入项目自己的服务状态页面

也就是说：

- Netdata 负责采集和系统监控
- 你自己的扩展负责产品化 UI

这是更合理的分工。

## 14. 如果做成扩展模块，推荐怎么做

推荐在：

```text
E:\My Project\Atramenti-Console\projects\extensions
```

下面新增类似模块，例如：

```text
projects/extensions/ops-observer
```

### 这个模块可以包含什么

- 一个后端路由层
  - 拉取 Netdata API
  - 拉取本机或远端服务状态
  - 拉取端口扫描结果
- 一个前端页面
  - 服务列表
  - 端口列表
  - 健康状态卡片
  - 简单依赖关系图
- 一个配置文件
  - 服务器地址
  - Netdata 地址
  - 需要检查的服务名和端口

## 15. 这个模块可以有自己的 UI 吗

完全可以，而且很值得做。

### 推荐 UI 结构

- 页面标题：`运维观测中心` 或 `Ops Observer`
- 区块 1：服务器健康状态
- 区块 2：服务状态
- 区块 3：端口监听情况
- 区块 4：网站 / OpenClaw / 网关依赖关系图
- 区块 5：最近错误和日志摘要

### 推荐展示内容

- 网站服务是否在线
- OpenClaw 是否在线
- 哪些端口在监听
- CPU / 内存概览
- 最近 10 分钟负载趋势
- 一键跳转到 Netdata 原始面板

## 16. 这个模块和 Netdata 的边界

不要把这个扩展做成“重造一个 Netdata”。

更合理的边界是：

### Netdata 负责

- 主机级指标
- 进程级指标
- 网络与系统监控

### 扩展模块负责

- 你自己的产品化总览页
- 服务健康检查
- 端口和模块关系可视化
- 把系统监控和业务视角串起来

## 17. 一个推荐的落地路线

### 第一步

先在服务器装 Netdata，确保你能看到系统状态。

### 第二步

在项目里做一个 `ops-observer` 扩展页面，只做轻量版：

- 服务在线状态
- 端口状态
- 链接到 Netdata

### 第三步

等以后模块更多了，再加：

- 更细的依赖关系图
- 更丰富的日志聚合
- 与 Grafana / OpenTelemetry 的联动

## 18. 一句话结论

Netdata 很适合先作为服务器侧的监控底座；而你完全可以在 `projects/extensions` 下做一个带自己 UI 的“运维观测模块”，把 Netdata 数据、端口状态、服务依赖关系统一展示出来。
