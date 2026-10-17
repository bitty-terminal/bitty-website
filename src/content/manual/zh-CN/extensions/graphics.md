# graphics（原生扩展）

有界 PNG 解码加光栅机制子集，用于行内图像。放置策略、矩形辅助与渲染器上传校验仍在 Core（`bitty-graphics` README；`src/kitty_decode.rs`、`src/kitty_raster.rs`、`src/geometry.rs`）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-graphics`（[github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics)）
- Crate：`bitty-graphics`（库，`src/lib.rs`）
- 成熟度：已落地并经独立验证；单一 `0.0.1` 库 crate。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。这正是 bitty#2143 点名的扩展（`extension install bitty-graphics --version X.Y.Z`）：命令形式是真实的，但尚无 `bitty-graphics` 包，因此没有任何版本可填。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install bitty-graphics --version X.Y.Z
```

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是被 Core 消费的机制：解码与光栅数学运行在 Core 图形输入路径背后，由 Core 执行协议、放置与资源 bound。Lua 插件从不直接调用它。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
