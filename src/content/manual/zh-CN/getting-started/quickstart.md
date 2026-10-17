# 快速入门指南 (Quick Start Guide)

欢迎使用 **Bitty**，这是一款专为现代 Linux、macOS 与 Windows 环境设计的高性能、可编程 GPU 加速终端模拟器。Bitty 将轻量级 Rust 核心与隔离的、事件驱动的 Lua 扩展引擎融为一体。

## 安装指南

Bitty 面向主流操作系统提供自动化脚本、原生软件包、预编译二进制程序或源码构建等平等的安装途径：

### 自动化一键安装脚本

安装脚本通过单一指针（`latest.txt` 记录当前 tag）解析版本，从 R2 下载匹配的系统架构产物，并在安装前校验其 `.sha256` 附带文件。校验失败即中止（fail closed）。无需 Rust 工具链。

```bash
# Linux 与 macOS (Unix)
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash

# 锁定版本、预览安装计划或更改安装位置
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --version 0.0.23
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --dry-run
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --prefix ~/.local
```

```powershell
# Windows (PowerShell，用户级安装，无需管理员权限)
irm https://cdn.bitty.run/bitty/install/install.ps1 | iex
```

各脚本获取内容：Linux 安装版本化 `.tar.zst` 软件包（二进制文件外加桌面入口、图标与 AppStream 元信息）；macOS 安装裸架构二进制文件（DMG 仅为交互式拖拽安装镜像，不适合无人值守安装）；Windows x64 安装便携 ZIP 负载，Windows arm64 安装裸 exe。在 Git-Bash 下运行 `install.sh` 会失败并指引使用 `install.ps1`；FreeBSD 不是一键安装目标，请手动下载。0.1.0 的校验仅为哈希：暂无签名（Windows 签名推迟至 0.2.0 之后）。

> [!NOTE]
> **PENDING —— 在线 CDN 验证。**发布流程会在每次打 tag 时将两个脚本上传至稳定的 R2 键，但尚未完成任何一次真实 tag 上传与 CDN 回读验证。若上述 URL 无法访问，说明所有者侧发布仍未完成：请改用包管理器或从源码构建。

### 原生软件包

每个 Linux 软件包在发布前都会在其发行版的干净容器中做安装冒烟测试（Ubuntu 24.04 deb、Fedora rpm、Arch 软件包、Alpine musl apk），无法安装或运行的包不会发布。

```bash
# Windows (Scoop)
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
scoop install bitty

# macOS (Homebrew)
brew tap bitty-terminal/homebrew-tap
brew install bitty

# Arch Linux (AUR)：预编译二进制包
paru -S bitty-bin   # 或：yay -S bitty-bin
# 源码包 `bitty` 同样存在；除非需要本地源码编译，否则优先 `bitty-bin`。
```

> [!NOTE]
> **PENDING —— 首次 tag 发布。**Scoop、Homebrew 与 AUR 清单在打 tag 时生成，且依赖所有者侧密钥。在 0.0.23 首次 tag 发布完成前，这些渠道可能返回 404：请改用安装脚本或原生软件包。Flatpak（`flatpak install run.bitty.Bitty`）及更多包管理器将在 0.1.0 之后陆续落地——**PENDING**。

### Cargo（从 Git 仓库构建）

二进制程序没有 crates.io 安装途径，请从源码构建：

```bash
# 从 Git 仓库安装 `bitty` 二进制程序
# （需显式固定工具链：`cargo install --git` 不读取 rust-toolchain.toml）
cargo +1.98.1 install --git https://github.com/bitty-terminal/bitty.git bitty-terminal --locked
```

### 从源码编译

确保已安装 Rust 1.85+ 及相应平台的图形环境开发库（Linux 上需 Vulkan / Wayland / X11；macOS 上需 Metal；Windows 上需 DirectX 12 / Vulkan）：

```bash
git clone https://github.com/bitty-terminal/bitty.git
cd bitty
cargo build --release
sudo cp target/release/bitty /usr/local/bin/
```

## 首次启动

直接在命令行运行可执行文件启动 Bitty：

```bash
bitty
```

首次启动时，Bitty 会依据平台规范与探测优先级搜索配置文件：

- **Linux / BSD**：`$XDG_CONFIG_HOME/bitty/init.lua`（回退为 `~/.config/bitty/init.lua`）
- **macOS**：`~/Library/Application Support/bitty/init.lua`（或 `$XDG_CONFIG_HOME/bitty/init.lua`，回退为 `~/.config/bitty/init.lua`）
- **Windows**：`%APPDATA%\bitty\init.lua`（回退为 `%LOCALAPPDATA%\bitty\init.lua`）

> [!NOTE]
> Bitty 优先查找 `init.lua`；若不存在，也支持同级目录下的 `config.lua` 别名（兼容 WezTerm 命名习惯）。若均未找到，Bitty 将使用编译内置的零延迟默认配置直接启动。

## 默认快捷键

| 快捷键              | 操作            | 说明                           |
| :------------------ | :-------------- | :----------------------------- |
| `Ctrl+Shift+T`      | 新建标签页/窗口 | 打开一个新的终端工作区         |
| `Ctrl+Shift+W`      | 关闭视图        | 关闭当前聚焦的窗格或面板       |
| `Ctrl+Shift+P`      | 命令面板        | 打开带模糊搜索的交互式命令面板 |
| `Ctrl+Shift+F`      | 搜索            | 打开回滚缓冲区模式搜索         |
| `Ctrl+=` / `Ctrl+-` | 缩放            | 动态增大或减小当前字体字号     |
| `Ctrl+0`            | 重置缩放        | 重置字号为默认配置值           |
| `Ctrl+Shift+C`      | 复制            | 复制选中文本至系统剪贴板       |
| `Ctrl+Shift+V`      | 粘贴            | 从系统剪贴板粘贴文本           |

## 卸载与数据清理

若需完全卸载 Bitty 及相关的本地用户数据：

### 1. 移除二进制文件

```bash
# Scoop (Windows)
scoop uninstall bitty

# Homebrew (macOS)
brew uninstall bitty

# Cargo（从 Git 仓库安装时）
cargo uninstall bitty-terminal

# 手动二进制安装
sudo rm /usr/local/bin/bitty
```

### 2. 移除配置文件

- **Linux / BSD**：`rm -rf ~/.config/bitty`（或 `$XDG_CONFIG_HOME/bitty`）
- **macOS**：`rm -rf ~/Library/Application\ Support/bitty ~/.config/bitty`
- **Windows (PowerShell)**：`Remove-Item -Recurse -Force $env:APPDATA\bitty`

### 3. 清理日志、状态与缓存数据

- **Linux / BSD**：`rm -rf ~/.local/state/bitty ~/.cache/bitty`
- **macOS**：`rm -rf ~/Library/Logs/bitty ~/Library/Caches/bitty`
- **Windows (PowerShell)**：`Remove-Item -Recurse -Force $env:LOCALAPPDATA\bitty`

## 下一步

- [CLI 命令行控制](cli.md) — 探索命令行参数与运行时控制守护命令。
- [配置参考手册](../configuration/overview.md) — 自定义字体、透明度及快捷键映射（支持热重载）。
- [插件架构与开发](../plugins/getting-started.md) — 构建沙箱化、零启动开销的 Lua 插件。
