# statusline（Lua 插件）

经状态组件组合呈现 cwd、模式、git 与任务：响应式终端事件到来即重组声明式组件。

- 插件 id：`bitty-terminal.statusline` · manifest 版本 `0.0.1`（`bitty-plugin.toml:11-14`）
- 源码：[github.com/bitty-terminal/statusline](https://github.com/bitty-terminal/statusline) · 独立仓库，**尚未进入官方注册表**
- 能力（`bitty-plugin.toml:23-33`）：`terminal.semantic-read`、`ui.rich`

## 安装

Lua 插件没有 CDN 版本，且该插件暂无注册表条目。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/statusline.git
bitty plugin enable bitty-terminal.statusline
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:34-43`）：无命令——manifest 声明的观测事件激活并驱动重组：`terminal.cwd-changed`、`terminal.title-changed`、`focus.changed`、`terminal.opened`。

`lua/statusline/` 中使用的调用：

- `bitty.events.subscribe` —— 订阅响应式事件集（`init.lua:76-94`）
- `bitty.terminal.snapshot` —— 只读已提交状态观测
- `bitty.ui.mount`／`bitty.ui.update` —— 挂载并刷新状态行槽
- `bitty.settings.get` —— 经 `M.SETTINGS` 映射读取呈现设置（`init.lua:32-39,42-68`）：`separator`、`show_cwd`、`show_title`、`show_exit`、`max_components`、`component_max_chars`

设置键（文件 `~/.config/bitty/plugins/bitty-terminal.statusline.toml`）：`separator`、`show_cwd`、`show_title`、`show_exit`、`max_components`、`component_max_chars`。缺失的键回落到内置默认值；见[按插件配置文件](../plugins/plugin-settings.md)。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.statusline.toml
separator = " | "
show_cwd = true
show_title = true
```

```bash
bitty plugin enable bitty-terminal.statusline
bitty config check   # 不启动 GUI 即可校验
```
