# copy-mode（Lua 插件）

基于公开历史快照 API 的模态可视选择策略：一次有界 transcript 查询，然后在缓存页上做 anchor/光标选择，经授权门控 yank。只是呈现状态——从不修改终端真相。

- 插件 id：`bitty-terminal.copy-mode` · manifest 版本 `0.0.1`（`bitty-plugin.toml:25-28`）
- 源码：[github.com/bitty-terminal/copy-mode](https://github.com/bitty-terminal/copy-mode) · 官方注册表条目
- 能力（`bitty-plugin.toml:40-54`）：`history.transcript.read`、`clipboard.write`

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/copy-mode.git
bitty plugin enable bitty-terminal.copy-mode
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:55-72`）：命令 `bitty-terminal.copy-mode:open`、`:move`、`:anchor`、`:yank`、`:close`。无事件订阅——该插件从不流式订阅。

`lua/copy-mode/init.lua` 中使用的调用：

- `bitty.commands.register` —— 注册五个选择动词（`:722-772`）
- `bitty.history.transcript.query` —— 每次 `open` 做一次有界定域快照查询（`:258-280`）；操作 `list`／`tail`／`search`
- `bitty.selection.copy` —— 在剪贴板授权背后导出选中区间
- `bitty.settings.get` —— 读取页预算（`:661`）

设置键与内置默认值（`init.lua:64-65`）：`row_count`（默认 10）、`max_bytes`（默认 4096）。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.copy-mode.toml
row_count = 10
max_bytes = 4096
```

```bash
bitty plugin enable bitty-terminal.copy-mode
bitty config check   # 不启动 GUI 即可校验
```
