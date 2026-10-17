# observability（原生扩展）

终端运行时与插件生态的只读观测缝：调试与追踪的实现侧。只观测，不持有任何权限（`bitty-observability` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-observability`（[github.com/bitty-terminal/bitty-observability](https://github.com/bitty-terminal/bitty-observability)）
- Crates：`bitty-observability-api`、`bitty-observability-core`、`bitty-observability`
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

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它支撑 Core 向已授权插件提供的只读检查 API——即 [devtools](devtools.md) 插件消费的 `bitty.debug.inspect` / `bitty.debug.trace` / `bitty.debug.trace_get`（脱敏与采集分类见 `crates/bitty-observability-core/src/`）。插件只能观测 Core 允许的内容；该 crate 从不授予权限。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
