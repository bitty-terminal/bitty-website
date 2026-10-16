# bar（Lua 插件）

统一工作区 bar、标签页与状态行呈现，落在通用 chrome insets 上：渲染一条工作区 bar（每个工作区一个 pill），点击 pill 即聚焦对应工作区。

- 插件 id：`bitty-terminal.bar` · manifest 版本 `0.0.1`（`bitty-plugin.toml:11-14`）
- 源码：[github.com/bitty-terminal/bar](https://github.com/bitty-terminal/bar) · 官方注册表条目
- 能力（`bitty-plugin.toml:24-32`）：`ui.rich`、`workspace.read`、`workspace.control`

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/bar.git
bitty plugin enable bitty-terminal.bar
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:34-46`）：

- 命令：`bitty-terminal.bar:focus`（非活跃 pill 的点击目标）
- 事件：`workspace.created`、`workspace.closed`、`workspace.renamed`、`workspace.focused`、`workspace.changed`、`config.reloaded`

`lua/bar/init.lua` 中使用的调用：

- `bitty.commands.register` —— 注册 `focus`（`:343`）
- `bitty.events.subscribe` —— 工作区事件到来时重绘（`:346-377`）
- `bitty.workspace.list` —— 枚举 pill（`:340`）
- `bitty.workspace.focus` —— pill 点击目标
- `bitty.ui.mount`／`bitty.ui.update` —— 挂载并刷新 bar 带
- `bitty.settings.get` —— 读取 chassis 设置（`:332-333`）

设置键与内置默认值（`init.lua:56-61`）：`show`（默认 true）、`edge`（默认 `"bottom"`）、`show_single`（默认 false）、`name_max_chars`。另见[bar 模块用户指南](../plugins/bar-modules.md)。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.bar.toml
show = true
edge = "bottom"
show_single = false
name_max_chars = 32
```

```bash
bitty plugin enable bitty-terminal.bar
bitty config check   # 不启动 GUI 即可校验
```
