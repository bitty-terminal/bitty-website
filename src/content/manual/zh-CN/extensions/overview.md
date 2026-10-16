# 扩展目录

Bitty 有两种可安装的扩展。本目录为每一种扩展提供一页文档：功能说明、安装方法、Lua API 界面，以及最小配置示例。

## 两条安装轨道

- **原生上游扩展**（[原生组件边界](upstream-components.md)背后的 Rust 二进制）：通过 `bitty extension install <name> --version X.Y.Z` 安装（哈希验证的 CDN 包），或用 `bitty extension add <path>` 从本地 staged。名称与版本必须精确——没有 `latest` 指针。
- **Lua 插件**（插件 API 之上的沙盒 Lua）：通过 `bitty plugin install <git-url>`（或本地目录）安装，再用 `bitty plugin enable <id>` 激活。Lua 插件没有 CDN 版本；各页面引用其 `bitty-plugin.toml` 中声明的版本。

## 安装状态图例

- **已发布** — CDN 上存在真实的 `SHA256SUMS`；页面给出精确安装命令。
- **未发布** — CDN 上不存在包；页面明确标注，并给出本地 `add`／安装所需的仓库路径。

以下发布状态于 2026-10-16 实时验证：所有 `extensions/<name>/<version>/SHA256SUMS` 探测均返回 404，而同一 CDN 的 `install/` 与 `manual/` 返回 200；以下所有仓库 URL 均经 `bitty-terminal` 组织列表确认。

## 原生上游扩展

| 扩展                             | 状态   | 页面                                      |
| -------------------------------- | ------ | ----------------------------------------- |
| network（共享网络运行时）        | 未发布 | [network](network.md)                     |
| ipc（跨进程 IPC 桥）             | 未发布 | [ipc](ipc.md)                             |
| agent（Agent 协议词汇）          | 未发布 | [agent](agent.md)                         |
| observability（调试/追踪观测缝） | 未发布 | [observability](observability.md)         |
| execution（作业监管器）          | 未发布 | [execution](execution.md)                 |
| graphics（有界图像解码）         | 未发布 | [graphics](graphics.md)                   |
| a11y（无障碍适配器）             | 未发布 | [a11y](a11y.md)                           |
| storage（有界 KV 机制）          | 未发布 | [storage](storage.md)                     |
| url-detector（纯文本链接扫描）   | 未发布 | [url-detector](url-detector.md)           |
| platform-services（桌面通知桥）  | 未发布 | [platform-services](platform-services.md) |

十个扩展目前都是 Rust 库 crate：均未产出可打包的 `bitty-<name>` 组件二进制，因此 `extension install` 或 `extension add` 暂无可 staged 的目标。各页面给出应跟踪的源码 checkout。

## Lua 插件

| 插件                                         | Manifest 版本 | 注册表   | 页面                            |
| -------------------------------------------- | ------------- | -------- | ------------------------------- |
| activity (`bitty-featured.activity`)         | 0.0.1         | official | [activity](activity.md)         |
| bar (`bitty-terminal.bar`)                   | 0.0.1         | official | [bar](bar.md)                   |
| composer (`bitty-terminal.composer`)         | 0.0.1         | official | [composer](composer.md)         |
| copy-mode (`bitty-terminal.copy-mode`)       | 0.0.1         | official | [copy-mode](copy-mode.md)       |
| file-manager (`bitty-terminal.file-manager`) | 0.1.0         | official | [file-manager](file-manager.md) |
| git-panel (`bitty-terminal.git-panel`)       | 0.1.0         | official | [git-panel](git-panel.md)       |
| history (`bitty-terminal.history`)           | 0.0.1         | official | [history](history.md)           |
| palette (`bitty-terminal.palette`)           | 0.0.1         | official | [palette](palette.md)           |
| search (`bitty-terminal.search`)             | 0.0.1         | official | [search](search.md)             |
| statusline (`bitty-terminal.statusline`)     | 0.0.1         | 尚未注册 | [statusline](statusline.md)     |
| wheel (`bitty-terminal.wheel`)               | 0.0.1         | official | [wheel](wheel.md)               |
| devtools (`bitty-featured.devtools`)         | 0.1.0         | 尚未注册 | [devtools](devtools.md)         |

`beacon`（跳转导航候选）不在目录中：它目前只是元数据脚手架，没有 manifest，也没有 Lua 实现。
