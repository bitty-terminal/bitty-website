# search（Lua 插件）

基于公开历史快照 API 的滚动回查找策略：有界定域 transcript 查询，类型化拒绝，不可信标记，结果导航，授权门控导出。只是呈现状态——从不修改终端真相。

- 插件 id：`bitty-terminal.search` · manifest 版本 `0.0.1`（`bitty-plugin.toml:25-28`）
- 源码：[github.com/bitty-terminal/search](https://github.com/bitty-terminal/search) · 官方注册表条目
- 能力（`bitty-plugin.toml:40-50`）：`history.transcript.read`（经 `bitty.selection.copy` 导出需要独立的 `clipboard.write` 授权，缺失即直接拒绝）

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/search.git
bitty plugin enable bitty-terminal.search
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:52-66`）：命令 `bitty-terminal.search:search`、`:next`、`:prev`、`:clear`、`:copy`。无事件订阅——该插件从不流式订阅。

`lua/search/init.lua` 中使用的调用：

- `bitty.commands.register` —— 注册五个动词（`:626-675`）
- `bitty.history.transcript.query` —— 每次 `search` 做一次有界定域快照查询（`:215-237`）；操作 `list`／`tail`／`search`
- `bitty.selection.copy` —— 导出当前匹配（无剪贴板授权即直接拒绝）
- `bitty.settings.get` —— 读取页预算（`:569`）

设置键与内置默认值（`init.lua:49-50`）：`row_count`（默认 10）、`max_bytes`（默认 4096）。

## 最小配置

```toml
# ~/.config/bitty/plugins/bitty-terminal.search.toml
row_count = 10
max_bytes = 4096
```

```bash
bitty plugin enable bitty-terminal.search
bitty config check   # 不启动 GUI 即可校验
```
