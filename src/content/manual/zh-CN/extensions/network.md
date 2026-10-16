# network（原生扩展）

共享的、可选的网络运行时：连接池、DNS、TLS，以及供各 Lua 插件共享的线框 framing，而不必各自内置一套网络栈。Core 自身不链接任何网络代码；网络机制只存在于该 crate（`bitty-network` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-network`（[github.com/bitty-terminal/bitty-network](https://github.com/bitty-terminal/bitty-network)）
- Crates：`bitty-network-api`、`bitty-network-core`、`bitty-network-dns`、`bitty-network-tls`、`bitty-network-wire`、`bitty-network-lua`、`bitty-net`
- 成熟度：活跃的 L1 Rust 核心扩展库；尚无打包好的组件二进制。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install <name> --version X.Y.Z
```

## Lua / 宿主界面

`bitty-network-lua` 在插件 VM 中注册 `bitty.network` 表（`crates/bitty-network-lua/src/lib.rs:159`，`register_network_module`）：

- `bitty.network.echo` —— 该 crate 自测使用的往返探针（`src/callback.rs:16`）
- `bitty.network.info` —— 运行时元数据查询（`src/callback.rs:48`）

调用方需要相应的网络能力授权；未授权时宿主直接拒绝。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
