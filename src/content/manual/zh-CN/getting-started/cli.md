# CLI 命令行参数与控制

Bitty 提供了统一、纯解析的命令行工具链，用于启动终端、检查运行时状态、管理多环境配置（Profile）、配置插件以及驱动外部自动化。

运行 `bitty --help` 查看精简概览，`bitty --help -v` 查看全部标志，`bitty <command> --help` 查看单命令详情。

> [!NOTE]
> 不存在 `bitty help` 子命令：`bitty help` 会把 `help` 当作待启动的程序。请使用 `bitty --help` 或 `bitty -h`。（见 [bitty#1900](https://github.com/bitty-terminal/bitty/issues/1900)。）

## 终端调用 (`bitty`)

主二进制程序用于启动 GUI 窗口并派生 Shell 会话：

```bash
bitty [OPTIONS] [PROGRAM [ARGS...]]
bitty [OPTIONS] -- PROGRAM [ARGS...]
```

### 核心启动参数

| 参数                   | 说明                                                                               |
| :--------------------- | :--------------------------------------------------------------------------------- |
| `--config <PATH>`      | 显式指定配置文件路径（覆盖 `$XDG_CONFIG_HOME/bitty/init.lua` 与 `BITTY_CONFIG`）。 |
| `--profile <NAME>`     | 加载 `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` 命名配置（作为基础层生效）。     |
| `--theme <NAME>`       | 单次启动 CLI 色彩主题覆盖（优先级高于配置文件和 Profile）。                        |
| `--font-family <NAME>` | 单次启动 CLI 字体系列覆盖。                                                        |
| `--font-size <PTS>`    | 单次启动 CLI 字体点阵大小覆盖（例如 `12.5`）。                                     |
| `--opacity <FLOAT>`    | 单次启动 CLI 窗口透明度覆盖（例如 `0.85`）。                                       |
| `--safe`               | **安全恢复模式**：禁用所有第三方插件、监听器与用户配置；强制使用内置默认值。       |
| `--fail-loud`          | 若主 Shell 或启动步骤失败则立即以非零状态码中止（调试姿态）。                      |
| `--test-mode`          | 启动确定性无头端到端伺服循环，连接至 `BITTY_SOCKET` IPC 接口直至退出。             |
| `-v, --verbose`        | `--log-level debug` 的简写；在 stderr 输出逐帧渲染 tick 统计。                     |
| `--log-level <LEVEL>`  | 设置 stderr 日志等级（`error`, `warn`, `info`, `debug`, `trace`）。                |
| `--mascot`             | 向标准输出打印吉祥物 Bittie ASCII 艺术字并退出。                                   |
| `--no-splash`          | 抑制首次启动的吉祥物欢迎画面。                                                     |
| `--no-color`           | 禁用 ANSI 着色（同时遵循 `NO_COLOR`）。                                            |
| `--socket <PATH>`      | 控制目标 socket（配合 `ctl` / `list instances`）。                                 |
| `--instance <ID>`      | 控制目标实例（配合 `ctl` / `list instances`）。                                    |
| `--`                   | 标志结束符；剩余词元均为 `PROGRAM` 参数。                                          |
| `-h, --help`           | 显示命令行参数帮助摘要并退出。                                                     |
| `-V, --version`        | 显示版本号、目标架构及构建元数据。                                                 |

### 布局与分屏参数

在启动时直接进入特定的分屏与布局状态：

| 参数                     | 说明                                                                                       |
| :----------------------- | :----------------------------------------------------------------------------------------- |
| `--split [AXIS[:RATIO]]` | 分屏启动窗格（`horizontal`/`h`、`vertical`/`v`，默认 `h`，比例默认 `0.5`）。               |
| `--split-ratio <FLOAT>`  | 设置分屏比例（0.10 至 0.90，例如 `0.3`）。                                                 |
| `--stack`                | 请求堆叠布局模式（Stack Layout）。                                                         |
| `--overlay`              | 请求覆层展示模式（Overlay Presentation）。                                                 |
| `--layout <SPEC>`        | 原始布局规范字符串（例如 `"single"`, `"split:h:0.5"`, `"stack"`, `"overlay:5,5,20,10"`）。 |
| `--focus <TARGET>`       | 初始焦点目标（`"next"`, `"prev"`, `"up"`, `"down"`, `"left"`, `"right"` 或 id）。          |

### 无头与测试参数

| 参数          | 说明                                                                   |
| :------------ | :--------------------------------------------------------------------- |
| `--headless`  | 仅执行单次无头渲染冒烟测试，不创建显示服务器窗口直接退出。             |
| `--test-mode` | 启动确定性无头端到端伺服循环，连接至 `BITTY_SOCKET` IPC 接口直至退出。 |

---

## 子命令

Bitty 共 15 个子命令。本地动词无需运行实例；运行时动词（`ctl`、`cmd`）通过 IPC（仅 Unix）操控一个 live 实例。

### 显式子进程启动 (`bitty run`)

```bash
# 以前台子进程运行程序（本地，继承 stdio）
bitty run -- COMMAND [ARGS...]
```

### 运行时控制 (`bitty ctl`)

控制一个运行中的实例（需要一个 live 实例；仅 Unix IPC）：

```bash
bitty ctl instance list
bitty ctl window list
bitty ctl "view list" | view split [--left|--right|--up|--down] | view focus v:N
bitty ctl terminal list | terminal spawn [--cwd PATH] | terminal close t:N
bitty ctl terminal send t:N TEXT | terminal text t:N
bitty ctl workspace list | workspace new | workspace close ws:N
bitty ctl workspace focus ws:N | workspace move ws:N
bitty ctl workspace rename ws:N NAME | workspace move-panel POSITION
bitty ctl config reload
```

输出形状：`--format table|json|jsonl`。目标优先级：`--socket`、`--instance`、`BITTY_SOCKET`/`BITTY_INSTANCE_ID`、唯一 live 实例兜底。

> [!NOTE]
> `ctl` 中没有 panel 资源：当前 panel id 尚无查询途径。`view list` 报告视图（`v:N` 加 `focused` 标记）。见 [bitty#1900](https://github.com/bitty-terminal/bitty/issues/1900)。

### 配置管理 (`bitty config`)

别名：`bitty cfg`

```bash
# 打印当前生效的配置文件绝对路径
bitty config path

# 离线验证配置文件语法与 Schema 结构，无需启动 GUI
bitty config check

# 使用 $VISUAL 或 $EDITOR 打开当前配置文件
bitty config edit
```

### 初始化向导 (`bitty init`)

按需使用的交互式配置向导：

```bash
# 运行交互式配置向导
bitty init

# 跳过交互提示，直接写入合理的默认配置
bitty init --yes

# 强制覆盖已有配置文件（会自动生成 .bak 备份）
bitty init --force
```

### 安装与环境诊断 (`bitty doctor`)

诊断 GPU 驱动、字体、环境依赖与健康状态：

```bash
# 显示格式化诊断表格
bitty doctor

# 以 JSON 格式输出诊断报告
bitty doctor --format json
```

### 资源枚举 (`bitty list`)

别名：`bitty ls`

```bash
# 列出可用的内置与用户色彩主题
bitty list themes

# 列出已安装插件及其激活状态
bitty list plugins

# 列出当前正在运行的 Bitty 终端实例
bitty list instances
```

### 状态解释 (`bitty inspect`)

解释生效状态与归属，不加载任何插件 VM：

```bash
bitty inspect command core.terminal.text
bitty inspect key ctrl+shift+m
bitty inspect plugin bitty-terminal.shell-integration
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

### 开发者工具 (`bitty dev`)

无头追踪、帧捕获、输入合成、转储与渲染覆层（本地；部分动词需要 `dev-tools` cargo feature）：

```bash
bitty dev trace <startup|latency> [--iterations N]
bitty dev capture [--layout single|split|stack|overlay]
bitty dev synthesize
bitty dev dump <grid|scene|atlas> [--rows N] [--cols N]
bitty dev overlay <list|show <damage|cells|glyphs|images|layout|banner>>
```

### 插件管理 (`bitty plugin`)

本地插件记录管理（绝不加载插件 VM）：

```bash
# 列出已记录与已安装插件、来源与能力授予
bitty plugin list

# 安装内置插件 id，或本地目录包
bitty plugin install <id> [--yes]
bitty plugin install <path> [--yes]

# 移除记录（内置：删除条目；已安装：删除树）
bitty plugin remove <id> --force

# 不删除记录的前提下重新启用 / 禁用
bitty plugin enable <id>
bitty plugin disable <id>

# 不删除记录的前提下撤销授予（全部或单个能力）
bitty plugin revoke <id> [--cap <capability>]

# 显示单个插件的清单与已记录授予
bitty plugin info <id>
```

> [!NOTE]
> 远端（`git`）来源与本地压缩包暂不支持：`install` 只接受内置 id 或已解包的本地目录。见 [bitty#1901](https://github.com/bitty-terminal/bitty/issues/1901)。

能力安装时提示 `Grant these capabilities? [y/N]`；`--yes` 以非交互方式批准。授权绑定到精确的清单哈希，新增能力始终需要重新确认。

### 原生扩展管理 (`bitty extension`)

管理进程外上游扩展二进制（用户 `$XDG_DATA_HOME/bitty/extensions/` 优先于系统路径；SHA-256 摘要校验）。`component` 是 `extension` 的隐藏已弃用别名（同一处理逻辑，至少保留至 0.1.0），绝不出现在帮助文本中。

```bash
# 列出已安装的扩展及其二进制摘要
bitty extension list

# 仅从本地路径暂存扩展（不下载）
bitty extension add /usr/local/bin/bitty-net

# 拉取一个经哈希校验的 R2 预构建版本（显式确认，TOFU 锁定）
bitty extension install net --version 0.0.23

# 移除用户层扩展（绝不触碰系统层）
bitty extension remove net

# 打印精确锁定的可执行文件字节（来源信息输出至 stderr）
bitty extension show-source net
```

### 直接调用 (`bitty cmd`)

```bash
# 按限定 id 直接调用任意注册可执行体（自动化逃生舱）
bitty cmd core.terminal.text --format json -- '{"terminal_id": "t:4"}'
```

### 插件命名空间 (`bitty x`)

```bash
# 无需别名再生，直接寻址已安装插件命令
bitty x <publisher>.<name> <command> [args]
bitty x <id> --help
```

### Shell 补全脚本生成 (`bitty completion`)

别名：`bitty comp`。支持的 Shell：`bash`、`zsh`、`fish`、`powershell`、`nushell`（`nu`）。

```bash
# 生成 Shell 补全脚本
bitty completion bash > ~/.bash_completion.d/bitty
bitty completion zsh > ~/.zfunc/_bitty
bitty completion fish > ~/.config/fish/completions/bitty.fish
```

### Shell 集成 (`bitty shell-init`)

输出 prompt hook（OSC 7 cwd + OSC 133 标记）与补全装配。Shell 列表同 `completion`。

```bash
bitty shell-init bash
```

### 版本 (`bitty version`)

```bash
bitty version
bitty version --format json
```
