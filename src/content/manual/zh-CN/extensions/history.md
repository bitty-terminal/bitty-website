# history（Lua 插件）

基于公开历史读取宿主 API 的可选加入历史 keeper：对 transcript 片段、命令历史与插件自有 KV 命名空间做定域有界快照查询，以脱敏、截断、带出处的结果或类型化拒绝作答。从不流式订阅，从不碰会话快照。

- 插件 id：`bitty-terminal.history` · manifest 版本 `0.0.1`（`bitty-plugin.toml:27-30`）
- 源码：[github.com/bitty-terminal/history](https://github.com/bitty-terminal/history) · 官方注册表条目
- 能力（`bitty-plugin.toml:42-57`）：`history.transcript.read`、`history.commands.read`、`history.kv.read`（无导出授权：读取从不意味着剪贴板、文件或进程导出）

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/history.git
bitty plugin enable bitty-terminal.history
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:59-68`）：命令 `bitty-terminal.history:query-transcript`、`:query-commands`、`:query-kv`。无事件订阅——对已持久化状态的一次性查询。

`lua/history/init.lua` 中使用的调用：

- `bitty.commands.register` —— 注册三个查询命令（`:555-577`）
- `bitty.history[source].query` —— 对 `transcript`／`commands`／`kv` 源的动态分发（`:486`；源见 `:70`）
- `bitty.api_version` —— 要求插件 API `^1.0` 的兼容门（`:522`）

设置键：未发现——边界随每次查询传入；超边界的查询由宿主拒绝。

## 最小配置

无需设置文件。启用后从面板查询：

```bash
bitty plugin enable bitty-terminal.history
```
