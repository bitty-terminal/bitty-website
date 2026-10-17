# platform-services（原生扩展）

平台通知桥：Linux D-Bus、macOS 通知中心、Windows Toast 投递的统一 fail-closed 接口。它不解析终端输出——Core 先解析 OSC 777 与 Kitty 通知序列并执行频率预算，再交出已限流的 `{title, body}`（`bitty-platform-services` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-platform-services`（[github.com/bitty-terminal/bitty-platform-services](https://github.com/bitty-terminal/bitty-platform-services)）
- 布局：多 crate 工作区（`crates/`）
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

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是 `platform.notify` 能力与 Lua 插件所用 `bitty.notify.show` 背后的投递机制（见 [activity](activity.md) 与 [wheel](wheel.md)）。插件申请 `platform.notify` 并调用 `bitty.notify.show`；Core 限流，该 crate 投递。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
