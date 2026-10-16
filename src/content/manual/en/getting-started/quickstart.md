# Quick Start Guide

Welcome to **Bitty**, a high-performance, programmable GPU-accelerated terminal emulator designed for Linux, macOS, and Windows. Bitty combines a lightweight Rust core with an isolated, event-driven Lua extension engine.

## Installation

Bitty is distributed across all major operating systems via automated install scripts, native packages, prebuilt binaries, or built directly from source:

### Automated Install Scripts

The scripts resolve the release through a single pointer (`latest.txt` holds the current tag), download the matching per-OS artifact from R2, and verify its `.sha256` sidecar before installing. Verification is fail closed: a checksum mismatch aborts the install. No Rust toolchain is needed.

```bash
# Linux and macOS (Unix)
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash

# Pin a version, preview the plan, or change the install location
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --version 0.0.23
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --dry-run
curl -fsSL https://cdn.bitty.run/bitty/install/install.sh | bash -s -- --prefix ~/.local
```

```powershell
# Windows (PowerShell, user-local, no admin rights needed)
irm https://cdn.bitty.run/bitty/install/install.ps1 | iex
```

What each script fetches: Linux installs the versioned `.tar.zst` bundle (binary plus desktop entry, icons, and AppStream metainfo); macOS installs the bare per-arch binary (the DMG stays an interactive drag-to-install image, unsuitable for headless install); Windows x64 installs the portable ZIP payload and Windows arm64 the bare exe. Running `install.sh` under Git-Bash fails closed and points at `install.ps1`; FreeBSD is not a bootstrap target and gets manual-download guidance. Verification in 0.1.0 is hash-only: there are no signatures yet (Windows signing is deferred past 0.2.0).

> [!NOTE]
> **PENDING — live CDN verify.** The release workflow uploads both scripts to their stable R2 keys on every tag, but no live tag upload and CDN read-back has completed yet. If the URLs above do not resolve, the owner-side publish is still outstanding: install from a package manager or build from source below.

### Native Packages

Every Linux package is install-smoked in a clean container of its own distro (Ubuntu 24.04 deb, Fedora rpm, Arch package, Alpine musl apk) before a release can publish, so a package that installs or runs nowhere never ships.

```bash
# Windows (Scoop)
scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket
scoop install bitty

# macOS (Homebrew)
brew tap bitty-terminal/homebrew-tap
brew install bitty

# Arch Linux (AUR): prebuilt binary package
paru -S bitty-bin   # or: yay -S bitty-bin
# Source build package `bitty` also exists; prefer `bitty-bin` unless
# you specifically need a local source compile.
```

> [!NOTE]
> **PENDING — first tag publish.** Scoop, Homebrew, and AUR manifests are generated at tag time and gated on owner-side secrets. Until the first 0.0.23 tag publish completes, these channels may 404: use the install scripts or a native package instead. Flatpak (`flatpak install run.bitty.Bitty`) and further managers land progressively after 0.1.0 — **PENDING**.

### Cargo (build from the Git repository)

There is no crates.io install path for the binary. Build from source instead:

```bash
# Install the `bitty` binary from the Git repository
# (pin the toolchain explicitly: `cargo install --git` does not read rust-toolchain.toml)
cargo +1.98.1 install --git https://github.com/bitty-terminal/bitty.git bitty-terminal --locked
```

### Building from Source

Ensure you have Rust 1.85+ and native graphics platform libraries installed (Vulkan / Wayland / X11 on Linux, Metal on macOS, DirectX 12 / Vulkan on Windows):

```bash
git clone https://github.com/bitty-terminal/bitty.git
cd bitty
cargo build --release
sudo cp target/release/bitty /usr/local/bin/
```

## First Launch

Launch Bitty by invoking the executable:

```bash
bitty
```

On first startup, Bitty probes for your configuration file according to platform standards:

- **Linux / BSD**: `$XDG_CONFIG_HOME/bitty/init.lua` (fallback `~/.config/bitty/init.lua`)
- **macOS**: `~/Library/Application Support/bitty/init.lua` (or `$XDG_CONFIG_HOME/bitty/init.lua`, fallback `~/.config/bitty/init.lua`)
- **Windows**: `%APPDATA%\bitty\init.lua` (fallback `%LOCALAPPDATA%\bitty\init.lua`)

> [!NOTE]
> Bitty searches for `init.lua` first; if absent, it also accepts a sibling `config.lua` fallback alias (WezTerm-compatible naming). If no configuration file exists, Bitty starts immediately using compiled-in zero-delay defaults.

## Default Keybindings

| Shortcut            | Action           | Description                                 |
| :------------------ | :--------------- | :------------------------------------------ |
| `Ctrl+Shift+T`      | New Tab / Window | Open a new terminal workspace               |
| `Ctrl+Shift+W`      | Close View       | Close currently focused pane or panel       |
| `Ctrl+Shift+P`      | Command Palette  | Open interactive palette with fuzzy search  |
| `Ctrl+Shift+F`      | Search           | Open scrollback pattern search              |
| `Ctrl+=` / `Ctrl+-` | Zoom             | Increase or decrease live font point size   |
| `Ctrl+0`            | Reset Zoom       | Reset font size to default configured value |
| `Ctrl+Shift+C`      | Copy             | Copy selection to system clipboard          |
| `Ctrl+Shift+V`      | Paste            | Paste text from system clipboard            |

## Uninstallation & Data Cleanup

To cleanly remove Bitty and all associated user data:

### 1. Remove the Binary

```bash
# Scoop (Windows)
scoop uninstall bitty

# Homebrew (macOS)
brew uninstall bitty

# Cargo (when installed from the Git repository)
cargo uninstall bitty-terminal

# Manual binary installation
sudo rm /usr/local/bin/bitty
```

### 2. Remove Configuration Files

- **Linux / BSD**: `rm -rf ~/.config/bitty` (or `$XDG_CONFIG_HOME/bitty`)
- **macOS**: `rm -rf ~/Library/Application\ Support/bitty ~/.config/bitty`
- **Windows (PowerShell)**: `Remove-Item -Recurse -Force $env:APPDATA\bitty`

### 3. Clean Logs, State & Cache

- **Linux / BSD**: `rm -rf ~/.local/state/bitty ~/.cache/bitty`
- **macOS**: `rm -rf ~/Library/Logs/bitty ~/Library/Caches/bitty`
- **Windows (PowerShell)**: `Remove-Item -Recurse -Force $env:LOCALAPPDATA\bitty`

## Next Steps

- [CLI Commands & Controls](cli.md) — Discover command-line flags and control daemon commands.
- [Configuration Reference](../configuration/overview.md) — Customize fonts, opacity, and keybindings with live hot reload.
- [Plugin Architecture & Development](../plugins/getting-started.md) — Build sandboxed, zero-startup-overhead Lua plugins.
