# url-detector（原生扩展）

`&str` 上的纯算法纯文本 URL 检测器：手写扫描器，无 I/O，让链接检测不再把正则引擎或网络代码拉进 Core（`bitty-url-detector` README）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-url-detector`（[github.com/bitty-terminal/bitty-url-detector](https://github.com/bitty-terminal/bitty-url-detector)）
- 布局：多 crate 工作区（`crates/`），另有 `benches/` 与 `fuzz/` 目标
- 成熟度：服务于 bitty#1760 的活跃扩展库。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install <name> --version X.Y.Z
```

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是被 Core 消费的机制：扫描器运行在 Core 链接检测路径内，插件经公开的选择／终端 API 消费检测到的链接。Lua 插件从不直接调用它。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
