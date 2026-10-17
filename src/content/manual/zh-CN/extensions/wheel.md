# wheel（Lua 插件）

Wheel——官方 Agent Harness 插件（吉祥物：仓鼠 Bittie）。实现前脚手架：单个 `hello` 命令，走通安装→启用→通知路径。

- 插件 id：`bitty-terminal.wheel` · manifest 版本 `0.0.1`（`bitty-plugin.toml:11-14`）
- 源码：[github.com/bitty-terminal/wheel](https://github.com/bitty-terminal/wheel) · 官方注册表条目（嵌于 `bitty-ai`，属 AI 辖区）
- 能力（`bitty-plugin.toml:25-30`）：`platform.notify`

## 安装

Lua 插件没有 CDN 版本。从仓库安装，再启用：

```bash
bitty plugin install https://github.com/bitty-terminal/wheel.git
bitty plugin enable bitty-terminal.wheel
bitty plugin list   # 确认状态与授权
```

## Lua API 界面

声明的触发器（`bitty-plugin.toml:32-35`）：命令 `bitty-terminal.wheel:hello`。无事件，无设置。

`lua/wheel/init.lua` 中使用的调用：

- `bitty.commands.register` —— 注册 `hello`（`:24`）
- `bitty.notify.show` —— 展示 `Hello from bitty-terminal.wheel.`（`:29-31`）

## 最小配置

无需设置文件。启用后运行：

```bash
bitty plugin enable bitty-terminal.wheel
```

然后从命令面板调用 `bitty-terminal.wheel:hello`。
