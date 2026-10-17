# devtools（Lua 插件）

对插件运行时的只读检查与事件追踪：生命周期行、命令／事件注册、自身授权，以及以通知摘要呈现的有界事件追踪。

- 插件 id：`bitty-featured.devtools` · manifest 版本 `0.1.0`（`bitty-plugin.toml:12-15`）
- 源码：[github.com/bitty-terminal/devtools](https://github.com/bitty-terminal/devtools) · 独立仓库，**尚未进入官方注册表**
- 能力（`bitty-plugin.toml:25-40`）：`debug.inspect`、`debug.trace`、`platform.notify`（无 `debug.control`，无 `ui.*`：从不变更运行时状态）

## 安装

Lua 插件没有 CDN 版本，且该插件暂无注册表条目。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/devtools.git
bitty plugin enable bitty-featured.devtools
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:42-69`）：

- 命令：`bitty-featured.devtools:plugins`、`:commands`、`:events`、`:grants`、`:trace-start`、`:trace-stop`、`:trace-dump`
- 仅追踪可见的事件种类（Active 期间对追踪可见；插件本身不订阅）：`terminal.opened`、`terminal.closed`、`terminal.title-changed`、`terminal.cwd-changed`、`terminal.bell`、`focus.changed`、`selection.changed`、`process.exited`、`config.reloaded`

`lua/devtools/` 中使用的调用：

- `bitty.commands.register` —— 注册七个命令（`init.lua:86-184`）
- `bitty.debug.inspect` —— 生命周期行、注册表、自身授权（`init.lua`）
- `bitty.debug.trace`／`bitty.debug.trace_get` —— 有界事件追踪（`trace.lua:53`、`init.lua`）
- `bitty.notify.show` —— 渲染有界文本摘要

设置键：未发现。

## 最小配置

无需设置文件。启用后检查：

```bash
bitty plugin enable bitty-featured.devtools
```

然后从命令面板调用 `bitty-featured.devtools:plugins`。
