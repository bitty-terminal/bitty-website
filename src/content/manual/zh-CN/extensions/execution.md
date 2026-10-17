# execution（原生扩展）

执行监管器：在已接受的 W-132 合约背后负责作业生命周期、取消、进程资源与恢复。PTY/进程权限仍归 Core；该 crate 拥有监管机制（`bitty-execution` README；`src/supervisor.rs`、`src/command_risk.rs`）。

- 源码 checkout：`$BITTY_WORKSPACE/bitty-execution`（[github.com/bitty-terminal/bitty-execution](https://github.com/bitty-terminal/bitty-execution)）
- Crate：`bitty-execution`（库，`src/lib.rs`）
- 成熟度：已落地并经独立验证；单一 `0.0.1` 库 crate。

## 安装状态

> 未发布——已于 2026-10-16 验证（CDN `extensions/` 探测返回 404，见[目录总览](overview.md)）。没有可传给 `extension install` 的版本。

跟踪上述源码 checkout。首个预构建包发布后，按标准形式安装：

```bash
bitty extension list   # 确认当前已 staged 的内容（空表，退出码 0）
# 将来发布后：
# bitty extension install <name> --version X.Y.Z
```

## Lua / 宿主界面

该 crate 不暴露直接的 `bitty.*` Lua 命名空间。它是被 Core 消费的机制：监管、取消、cgroup/OOM 处理（`src/cgroup.rs`、`src/oom.rs`）与输出保留（`src/output.rs`、`src/retention.rs`）运行在 Core 进程 API 背后。Lua 插件从不直接调用它。

## 最小配置

原生扩展没有按扩展的用户配置文件，只需验证 staged 状态：

```bash
bitty extension list
```
