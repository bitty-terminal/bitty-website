# palette（Lua 插件）

基于可聚焦 overlay 槽的命令面板与选择器 UI：以呈现提示（`title`、`placeholder`）获取 overlay 并绘制过滤后的条目，完成即释放。只有声明式原语。

- 插件 id：`bitty-terminal.palette` · manifest 版本 `0.0.1`（`bitty-plugin.toml:11-14`）
- 源码：[github.com/bitty-terminal/palette](https://github.com/bitty-terminal/palette) · 官方注册表条目
- 能力（`bitty-plugin.toml:33-49`）：`ui.overlay.focus`（单一耦合授权）

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/palette.git
bitty plugin enable bitty-terminal.palette
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:51-56`）：

- 命令：`bitty-terminal.palette:toggle`
- 事件：`focus.changed`、`overlay.released`

`lua/palette/` 中使用的调用：

- `bitty.commands.register` —— 注册 `toggle`（`init.lua:143-172`）
- `bitty.events.subscribe` —— 观测 focus/overlay 转换（`init.lua:74`）
- `bitty.ui.overlay.acquire`／`bitty.ui.overlay.update` —— 一次 Core 拥有的切换挂载界面并绘制内容
- `bitty.settings.get` —— 读取 `entries`（`init.lua:52`）与 `query`（`init.lua:60`）

设置键（文件 `~/.config/bitty/plugins/bitty-terminal.palette.toml`）：`entries`、`query`。缺失的键回落到内置默认值；见[按插件配置文件](../plugins/plugin-settings.md)。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.palette.toml
query = ""
```

```bash
bitty plugin enable bitty-terminal.palette
bitty config check   # 不启动 GUI 即可校验
```
