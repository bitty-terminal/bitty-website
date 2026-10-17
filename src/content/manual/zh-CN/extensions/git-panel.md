# git-panel（Lua 插件）

平铺面板展示 git 分支、状态、diff 与 log，由白名单 `git` 子进程驱动，输出有界。要求 `PATH` 上有 `git >= 2.30`，声明于 manifest（`bitty-plugin.toml:52-60`）。

- 插件 id：`bitty-terminal.git-panel` · manifest 版本 `0.1.0`（`bitty-plugin.toml:18-21`）
- 源码：[github.com/bitty-terminal/git-panel](https://github.com/bitty-terminal/git-panel) · 官方注册表条目
- 能力（`bitty-plugin.toml:30-56`）：`panel.provider`、`panel.create`、`terminal.semantic-read`、`process.spawn:git`（仅 `git` 二进制；仅 `status`、`diff`、`log`、`branch`、`show`、`rev-parse`、`ls-files`），另有只读 `~/projects/**` 文件系统作用域

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/git-panel.git
bitty plugin enable bitty-terminal.git-panel
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:62-75`）：

- 命令：`bitty-terminal.git-panel:open`、`:status`、`:diff`、`:log`、`:branch`
- 事件：`terminal.cwd-changed`、`terminal.title-changed`、`focus.changed`

`lua/git-panel/` 中使用的调用：

- `bitty.commands.register` —— 注册五个命令（`init.lua:321-386`）
- `bitty.events.subscribe` —— 刷新快照派生的缓存（`init.lua:46-49`）
- `bitty.terminal.snapshot` —— 选择工作树的只读 cwd/title 观测

设置键：未发现——面板只从终端观测与 `git` 输出刷新。

## 最小配置

无需设置文件。启用后打开：

```bash
bitty plugin enable bitty-terminal.git-panel
```

然后在 `~/projects/` 下的 git checkout 中从命令面板调用 `bitty-terminal.git-panel:open`。
