# ipc（原生扩展）

通用的跨进程 IPC 桥边界：有界 framing、对端凭证认证、基于作用域的同意机制，承载 DevTools 与 MCP 协议。为 DevTools、无头、沙盒、面板扩展及 AI 插件提供通用基础设施（`bitty-ipc` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-ipc`（[github.com/bitty-terminal/bitty-ipc](https://github.com/bitty-terminal/bitty-ipc)）
- Crates：`bitty-ipc-api`、`bitty-ipc-core`、`bitty-ipc-auth`、`bitty-ipc-devtools`、`bitty-ipc-mcp`
- 成熟度：已从 Bitty Core 抽出，pre-1.0（`0.0.1`）；未发布到 crates.io。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install <name> --version X.Y.Z
```

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是被 Core 消费的机制：`bitty-ipc-devtools` 实现 DevTools 方法界面（`crates/bitty-ipc-devtools/src/devtools/`，例如 `automation_ops.rs` 中的 `captureFrame`、`createWorkspace`）与 MCP 适配器（`mcp_adapter.rs`），由 Core 在能力授权背后代为驱动。Lua 插件只能看到公开的插件 API v1 界面，从不直接接触该桥。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
