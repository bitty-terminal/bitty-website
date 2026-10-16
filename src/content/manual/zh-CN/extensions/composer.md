# composer（Lua 插件）

基于公开 overlay、提交与编辑器宿主 API 的可编辑命令行策略：模态缓冲、chord 路由、有界粘贴、外部编辑器往返。只是呈现状态——从不修改终端真相。

- 插件 id：`bitty-terminal.composer` · manifest 版本 `0.0.1`（`bitty-plugin.toml:16-19`）
- 源码：[github.com/bitty-terminal/composer](https://github.com/bitty-terminal/composer) · 官方注册表条目
- 能力（`bitty-plugin.toml:34-45`）：`ui.overlay.focus`、`terminal.input.submit`、`process.editor`

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/composer.git
bitty plugin enable bitty-terminal.composer
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:47-66`）：

- 命令：`bitty-terminal.composer:open`、`:submit`、`:cancel`、`:close`、`:editor`
- 事件：`overlay.released`、`focus.changed`

`lua/composer/init.lua` 中使用的调用：

- `bitty.commands.register` —— 注册五个会话动词（`:1055-1151`）
- `bitty.events.subscribe` —— 观测 overlay/focus 转换（`:459-620`）
- `bitty.ui.overlay.*` —— 获取、更新、释放模态界面
- `bitty.terminal.submit` —— 经 Core 粘贴管线有界提交缓冲
- `bitty.process.editor.start` —— 在 Core 拥有的临时文件上做白名单外部编辑器往返
- `bitty.keymaps.suggest` —— 通告打开 chord
- `bitty.settings.get` —— 读取 chord 设置（`:1007`）

设置键与内置默认值（`init.lua:48-61`）：`newline`（`enter`）、`submit`（`ctrl+enter`）、`close`（`escape`）、`external_editor`（`alt+e`）、`open_chord`（`alt+e`）。另见 [Composer 模态用法](../plugins/composer.md)。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.composer.toml
newline = "enter"
submit = "ctrl+enter"
close = "escape"
external_editor = "alt+e"
open_chord = "alt+e"
```

```bash
bitty plugin enable bitty-terminal.composer
bitty config check   # 不启动 GUI 即可校验
```
