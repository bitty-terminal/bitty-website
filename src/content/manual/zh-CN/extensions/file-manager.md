# file-manager（Lua 插件）

文件管理器列表、导航与预览：只有终端观测，载荷有界 8 KiB。唯一申请的能力门控着列表缓存据以刷新的只读 cwd/title 观测。

- 插件 id：`bitty-terminal.file-manager` · manifest 版本 `0.1.0`（`bitty-plugin.toml:11-14`）
- 源码：[github.com/bitty-terminal/file-manager](https://github.com/bitty-terminal/file-manager) · 官方注册表条目
- 能力（`bitty-plugin.toml:23-36`）：`terminal.semantic-read`

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/file-manager.git
bitty plugin enable bitty-terminal.file-manager
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:37-54`）：

- 命令：`bitty-terminal.file-manager:open`、`:preview`、`:rename`
- 事件：`terminal.cwd-changed`、`terminal.title-changed`、`focus.changed`

`lua/file-manager/` 中使用的调用：

- `bitty.commands.register` —— 注册三个命令（`init.lua:214-252`）
- `bitty.events.subscribe` —— 刷新快照派生的缓存（`init.lua:49-52`）
- `bitty.terminal.snapshot` —— 只读 cwd/title 观测
- `bitty.ui.mount`／`bitty.ui.register_panel` —— 呈现列表界面
- `bitty.settings.get` —— 读取 `entries`（`init.lua:116`）与 `root`（`init.lua:130`）

设置键（文件 `~/.config/bitty/plugins/bitty-terminal.file-manager.toml`）：`entries`、`root`。缺失的键回落到内置默认值；见[按插件配置文件](../plugins/plugin-settings.md)。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.file-manager.toml
root = "~/projects"
```

```bash
bitty plugin enable bitty-terminal.file-manager
bitty config check   # 不启动 GUI 即可校验
```
