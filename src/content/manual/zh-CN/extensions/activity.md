# activity（Lua 插件）

隐私优先的本地活跃时间线：把语义终端快照聚合成按日的本地计数、时长与 cwd 汇总，并以通知呈现。从不存储命令参数（`bitty-plugin.toml:67`，`store_command_args` 默认为 false）。

- 插件 id：`bitty-featured.activity` · manifest 版本 `0.0.1`（`bitty-plugin.toml:12-15`）
- 源码：[github.com/bitty-terminal/activity](https://github.com/bitty-terminal/activity) · 官方注册表条目
- 能力（`bitty-plugin.toml:25-36`）：`terminal.semantic-read`、`platform.notify`

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/activity.git
bitty plugin enable bitty-featured.activity
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:38-51`）：

- 命令：`bitty-featured.activity:summary`、`bitty-featured.activity:clear`
- 事件：`terminal.opened`、`terminal.closed`、`terminal.cwd-changed`、`process.exited`、`plugin.suspended`、`plugin.disposed`

`lua/activity/` 中使用的调用：

- `bitty.commands.register` —— 注册 `summary`／`clear`（`init.lua:197,212`）
- `bitty.events.subscribe` —— 驱动聚合更新与挂起时刷盘（`init.lua:223-307`）
- `bitty.terminal.snapshot` —— 聚合所需的只读 cwd/title 观测
- `bitty.notify.show` —— 渲染汇总文本
- `bitty.store` —— 跨 generation 持久化聚合（`init.lua:71`）
- `bitty.settings.get` —— 读取 `store_command_args`（`init.lua:67`）与 `retention_days`（`init.lua:68-71`，默认 `aggregate.DEFAULT_RETENTION_DAYS = 7`，见 `aggregate.lua:20`）

设置键（文件 `~/.config/bitty/plugins/bitty-featured.activity.toml`）：`store_command_args`（布尔，默认 false）、`retention_days`（数字，默认 7）。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-featured.activity.toml
store_command_args = false
retention_days = 7
```

```bash
bitty plugin enable bitty-featured.activity
bitty config check   # 不启动 GUI 即可校验
```
