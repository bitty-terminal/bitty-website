# storage（原生扩展）

有界隔离存储机制：Core 持久化 API 所移植的 KV 上限与文件系统后端（`bitty-storage` README；`src/kv.rs`、`src/ceiling.rs`）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-storage`（[github.com/bitty-terminal/bitty-storage](https://github.com/bitty-terminal/bitty-storage)）
- Crate：`bitty-storage`（库，`src/lib.rs`）
- 成熟度：活跃的扩展库；尚待独立验证。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install <name> --version X.Y.Z
```

## Lua / 宿主界面

该 crate 自身没有 Lua 命名空间，但它记录了 Lua 插件已在使用的后端：KV 上限“镜像 `bitty.store` 文件系统后端”（`src/ceiling.rs:4`），`src/kv.rs:3` 移植自 Core `bitty.store` 后端（有界 key 语法）。[activity](activity.md) 插件经 `bitty.store` 持久化其聚合。插件作者使用 Core 的 `bitty.store`／历史 KV API；该 crate 是背后的机制。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
