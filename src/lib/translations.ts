// src/lib/translations.ts
// Complete Home & Site i18n dictionaries for English (en) and Simplified Chinese (zh-CN).
// Enforces a strict, 100% single-language experience with zero mixed-language leakage.

export type SupportedLang = "en" | "zh-CN";

export interface Translations {
  // Site Header & Controls
  searchPlaceholder: string;
  themeLight: string;
  themeDark: string;
  navDocs: string;

  // Hero Section
  heroBadge1: string;
  heroBadge2: string;
  heroTitle: string;
  heroLede: string;
  getBittyBtn: string;
  exploreDocsBtn: string;

  // Install Deck
  installDeckBadge: string;
  installDeckChecksum: string;
  tabPackages: string;
  copyBtnLabel: string;
  copiedBtnLabel: string;
  installHintUnix: string;
  installHintWin: string;
  installHintPkg: string;
  installHintCargo: string;
  installHintDefault: string;
  directBinariesTitle: string;
  statusReady: string;
  directMatrixLink: string;
  directPkgPortable: string;

  // Showcase Stage
  showcaseReel1Tab: string;
  showcaseReel2Tab: string;
  showcaseReel3Tab: string;
  showcaseReel4Tab: string;
  showcaseDprIndicator: string;
  showcaseGpuIndicator: string;
  showcaseWindowTitle: string;
  showcasePtyTag: string;
  showcasePtyFocus: string;
  showcasePtyFooterNote: string;
  showcasePtyFooterTick: string;
  showcaseGuiTag: string;
  showcaseGuiDesc: string;
  showcaseCoprocessLabel: string;
  showcaseConfinementLabel: string;
  showcaseSplitTag: string;
  showcaseComposerTitle: string;
  showcaseComposerDesc: string;
  showcaseComposerHint: string;
  showcaseComposerSubmit: string;
  showcaseComposerDismiss: string;
  showcaseArchTitle: string;
  showcaseArchLayerDownstream: string;
  showcaseArchLayerCore: string;
  showcaseArchLayerUpstream: string;
  showcaseArchDownstreamDesc: string;
  showcaseArchCoreDesc: string;
  showcaseArchUpstreamDesc: string;

  // Linux Distro Matrix
  linuxEcosystemBadge: string;
  linuxEcosystemSubtitle: string;
  linuxMatrixTitle: string;
  linuxMatrixDesc: string;
  statNativeRust: string;
  statPackages: string;
  statIdleMem: string;
  filterAll: string;
  filterArch: string;
  filterDebian: string;
  filterFedora: string;
  filterSuse: string;
  filterAlpine: string;
  filterNix: string;
  filterSource: string;
  filterUniversal: string;
  distroArchLabel: string;
  distroDirectLabel: string;
  distroStatusReady: string;
  distroCopyBtn: string;
  distroAltLabel: string;
  distroViewQuick: string;
  distroViewAll: string;
  distroActiveDistroLabel: string;

  // 12 Distro Descriptions
  distroDescArch: string;
  distroDescDebian: string;
  distroDescFedora: string;
  distroDescSuse: string;
  distroDescAlpine: string;
  distroDescNix: string;
  distroDescVoid: string;
  distroDescGentoo: string;
  distroDescAppImage: string;
  distroDescFlatpak: string;
  distroDescSnap: string;
  distroDescTarball: string;

  // Bento Architecture Pillars
  pillarsTitle: string;
  pillarsSubtitle: string;
  bentoStage1Tag: string;
  bento1Badge: string;
  bento1Title: string;
  bento1Desc: string;
  bento1BtnLabel: string;
  bentoStage2Tag: string;
  bento2Badge: string;
  bento2Title: string;
  bento2Desc: string;
  bento2BtnLabel: string;
  bentoStage3Tag: string;
  bento3Badge: string;
  bento3Title: string;
  bento3Desc: string;
  bento3BtnLabel: string;
  bentoOpenDoc: string;

  // Documentation Index
  manualTitle: string;
  manualSubtitle: string;
  manualSecGettingStarted: string;
  manualSecConfiguration: string;
  manualSecPlugins: string;
  manualSecApi: string;
  manualDocsCount: string;

  // Localized Doc Titles on Index
  docTitleQuickstart: string;
  docTitleCli: string;
  docTitleConfigOverview: string;
  docTitleWorkspaces: string;
  docTitleActions: string;
  docTitlePluginStart: string;
  docTitleBarModules: string;
  docTitleComposer: string;
  docTitlePluginConfig: string;
  docTitleCapabilities: string;
  docTitleNativeComponents: string;
  docTitleApiOverview: string;
  docTitleApiUi: string;
  docTitleApiCommands: string;
  docTitleApiPanel: string;
  docTitleApiServices: string;
  docTitleApiSystem: string;

  // Site Footer
  footerTagline: string;
  footerDocLink: string;
  footerManualLink: string;
  footerSummary: string;
  footerProvenancePrefix: string;
  footerCorpusSetPrefix: string;
  footerRenderedEdge: string;
}

export const translations: Record<SupportedLang, Translations> = {
  en: {
    // Site Header & Controls
    searchPlaceholder: "Search docs (Ctrl+K)...",
    themeLight: "☀️ Light",
    themeDark: "🌙 Dark",
    navDocs: "Docs",

    // Hero Section
    heroBadge1: "★ GPU-ACCELERATED · RUST MICROKERNEL",
    heroBadge2: "PHODOPUS (PICCOLO FORK) · 0B IDLE SANDBOX",
    heroTitle: "SMALL CORE. HIGHLY PROGRAMMABLE TERMINAL PLATFORM.",
    heroLede:
      'Bitty is built on a timeless tenet: "Small core. Stable API. Everything composable. Extensions own the experience." A pure Rust microkernel preserves terminal truth and blazing GPU throughput, while sandboxed Phodopus (Piccolo Fork) and native coprocesses shape your ideal workspace—with zero background daemons.',
    getBittyBtn: "Get Bitty ⚡",
    exploreDocsBtn: "Explore Docs →",

    // Install Deck
    installDeckBadge: "QUICK INSTALL",
    installDeckChecksum: "SHA-256 CHECKSUMS ↗",
    tabPackages: "Packages",
    copyBtnLabel: "COPY",
    copiedBtnLabel: "COPIED!",
    installHintUnix:
      "Linux & macOS: Automated bootstrap fetching verified .tar.zst / binary",
    installHintWin:
      "Windows: PowerShell one-liner installing portable binary (user-local)",
    installHintPkg:
      "Package managers: Arch (AUR), Debian/Ubuntu (.deb), Fedora (.rpm), openSUSE, Alpine, NixOS, Flatpak",
    installHintCargo:
      "Build from source: compile with pinned toolchain (+1.98.1) via Cargo",
    installHintDefault: "Automated bootstrap & verified checksums",
    directBinariesTitle: "★ Direct R2 Binaries & Packages:",
    statusReady: "● READY",
    directMatrixLink: "Matrix ↓",
    directPkgPortable: "(Portable)",

    // Showcase Stage
    showcaseReel1Tab: "01 Dwindle Tiling & GUI Panels",
    showcaseReel2Tab: "02 Composer Modal (Alt+E)",
    showcaseReel3Tab: "03 Phodopus Sandbox & Coprocesses",
    showcaseReel4Tab: "Media Slot (GIF/Video)",
    showcaseDprIndicator: "High-DPR 120 FPS",
    showcaseGpuIndicator: "wgpu (Vulkan / Metal / DX12)",
    showcaseWindowTitle: "bitty — workspace 1:dev (dwindle)",
    showcasePtyTag: "PANEL #1 · PTY STREAM (t:1)",
    showcasePtyFocus: "focused · border_color_focused",
    showcasePtyFooterNote: "Microkernel decoupled view container",
    showcasePtyFooterTick: "0.42ms frame tick",
    showcaseGuiTag: 'PANEL #2 · LUA GUI VIEW (type="rich")',
    showcaseGuiDesc:
      "Panels are not limited to PTYs. Mount declarative bitty.ui trees directly into the Hyprland tiling grid:",
    showcaseCoprocessLabel: "Upstream Coprocess:",
    showcaseConfinementLabel: "Confinement:",
    showcaseSplitTag: "PANEL #3 · DWINDLE SPLIT (t:2)",
    showcaseComposerTitle: "COMPOSER MODAL · 64 KiB BRACKETED BUFFER",
    showcaseComposerDesc:
      "Multiline scratchpad with syntax highlighting. Send to active PTY or cancel.",
    showcaseComposerHint: "Enter to submit · Esc to close",
    showcaseComposerSubmit: "ENTER Submit to PTY",
    showcaseComposerDismiss: "ESC Dismiss",
    showcaseArchTitle: "bitty — microkernel architecture topology",
    showcaseArchLayerDownstream: "DOWNSTREAM LAYER",
    showcaseArchLayerCore: "CORE ENGINE",
    showcaseArchLayerUpstream: "UPSTREAM COPROCESS",
    showcaseArchDownstreamDesc:
      "Stackless, fuel-metered VM with module loader (require), pattern matching, and hard memory ceilings. 0B when installed, 32 MiB quota when active.",
    showcaseArchCoreDesc:
      "wgpu compositor, VT parser decoupled from state machine, headless runtime, and zero-allocation hot paths. Extensions never touch the parser.",
    showcaseArchUpstreamDesc:
      "Zero-daemon architecture. Ephemeral stdio Wire Protocol v1 coprocesses with Landlock confinement. Heavy tasks run isolated.",

    // Linux Distro Matrix
    linuxEcosystemBadge: "LINUX ECOSYSTEM",
    linuxEcosystemSubtitle: "★ Universal Linux Distribution & Package Support",
    linuxMatrixTitle: "Universal Linux Distribution Matrix",
    linuxMatrixDesc:
      "From bleeding-edge rolling releases (Arch, CachyOS) to stable enterprise deployments (Debian, Ubuntu, Fedora, openSUSE), lightweight musl systems (Alpine), and reproducible environments (NixOS)—Bitty runs natively everywhere.",
    statNativeRust: "100% NATIVE RUST",
    statPackages: "12 FORMATS & PKGS",
    statIdleMem: "0B IDLE MEMORY",
    filterAll: "All Formats (12)",
    filterArch: "Arch / CachyOS",
    filterDebian: "Debian / Ubuntu",
    filterFedora: "Fedora / RHEL",
    filterSuse: "openSUSE",
    filterAlpine: "Alpine (musl)",
    filterNix: "NixOS",
    filterSource: "Void & Gentoo",
    filterUniversal: "Universal (AppImage / Flatpak / Snap)",
    distroArchLabel: "ARCH:",
    distroDirectLabel: "Direct:",
    distroStatusReady: "● READY",
    distroCopyBtn: "COPY",
    distroAltLabel: "ALT:",
    distroViewQuick: "⚡ Quick Command",
    distroViewAll: "📋 All Distros",
    distroActiveDistroLabel: "Active Distro Package:",

    // 12 Distro Descriptions
    distroDescArch:
      "Automated AUR packaging with x86-64-v3/v4 hardware optimizations for instant startup and 0B idle Phodopus (Piccolo Fork) memory.",
    distroDescDebian:
      "Official signed .deb packages with complete desktop integration, systemd user service hooks, and automatic Wayland session detection.",
    distroDescFedora:
      "Automated COPR builds for Fedora and Enterprise Linux. Features SELinux policy compliance and full Vulkan/Wayland acceleration.",
    distroDescSuse:
      "Packaged for openSUSE with transactional update compatibility and YaST integration. Tested on rolling Tumbleweed releases.",
    distroDescAlpine:
      "Static, musl-linked binaries with ultra-small footprint. Built for low-overhead development containers and mobile Linux environments.",
    distroDescNix:
      "Fully hermetic, reproducible packaging. Declaratively import Bitty in your NixOS configuration or home-manager flake without dependency leaks.",
    distroDescVoid:
      "Native packages for Void Linux with clean runit service files and zero systemd dependencies. Available for glibc and musl.",
    distroDescGentoo:
      "Source-optimized ebuild recipe supporting granular USE flags for Wayland, Vulkan backend, Phodopus (Piccolo Fork) Lua VM, and coprocess runtime.",
    distroDescAppImage:
      "Single-file standalone bundle with all Wayland, Vulkan, and graphics libraries embedded. Run directly without installation or root privileges.",
    distroDescFlatpak:
      "Sandboxed desktop distribution with Wayland display and PipeWire portal permissions. Ideal for immutable operating systems.",
    distroDescSnap:
      "Universal snap package with classic confinement. Automatic background updates, seamless desktop integration, and zero library conflicts.",
    distroDescTarball:
      "Precompiled standalone binary compressed with ultra-fast Zstandard. Unpack straight into ~/.local/bin and run without administrative rights.",

    // Bento Architecture Pillars
    pillarsTitle: "Engineered for Composability & Isolation",
    pillarsSubtitle:
      "Zero monolithic bloat. Bitty separates terminal mechanics from extension policy.",
    bentoStage1Tag: "STAGE 01",
    bento1Badge: "TERMINAL TRUTH & TILING",
    bento1Title: "Hyprland Tiling × Terminal Truth",
    bento1Desc:
      "Strict separation between Terminal (canonical PTY state), View (presentation), and Layout (compositor). Dwindle & BSP binary trees with sub-pixel borders that never block hot paths.",
    bento1BtnLabel: "Read Workspaces Spec",
    bentoStage2Tag: "STAGE 02",
    bento2Badge: "PHODOPUS & WIRE V1",
    bento2Title: "Phodopus (Piccolo Fork) × Native Coprocesses",
    bento2Desc:
      "Independent sandbox-first runtime forked from Piccolo — complete with require module chains, pattern matching, fuel metering, and 32 MiB hard quotas at 0-byte idle memory; heavy workloads isolate safely over stdio Wire v1.",
    bento2BtnLabel: "Read Architecture Spec",
    bentoStage3Tag: "STAGE 03",
    bento3Badge: "CONFIGPLAN & RESILIENCE",
    bento3Title: "Declarative ConfigPlan & Safe Recovery",
    bento3Desc:
      "Instant ~/.config/bitty/init.lua reconciliation without dropping active PTY sessions, atomic schema rollback, and emergency bitty --safe recovery mode.",
    bento3BtnLabel: "Read Config Reference",
    bentoOpenDoc: "OPEN DOC →",

    // Documentation Index
    manualTitle: "Bitty Manual & Guides",
    manualSubtitle:
      "Official user manual, configuration reference, and Lua API documentation served directly from Cloudflare R2.",
    manualSecGettingStarted: "GETTING STARTED",
    manualSecConfiguration: "CONFIGURATION",
    manualSecPlugins: "PLUGINS & ARCH",
    manualSecApi: "LUA API",
    manualDocsCount: "DOCS",

    // Localized Doc Titles on Index
    docTitleQuickstart: "Quick Start Guide",
    docTitleCli: "CLI Commands & Controls",
    docTitleConfigOverview: "Configuration Overview",
    docTitleWorkspaces: "Workspaces & Panels",
    docTitleActions: "Actions Catalog",
    docTitlePluginStart: "Getting Started with Plugins",
    docTitleBarModules: "Bar Modules User Guide",
    docTitleComposer: "Composer Modal Usage",
    docTitlePluginConfig: "Per-Plugin Config Files",
    docTitleCapabilities: "Capabilities & Sandboxing",
    docTitleNativeComponents: "Native Component Boundary",
    docTitleApiOverview: "API Overview & Architecture",
    docTitleApiUi: "bitty.ui (Slots, Nodes & Overlays)",
    docTitleApiCommands: "bitty.commands & bitty.keymaps",
    docTitleApiPanel: "bitty.panel & bitty.workspace",
    docTitleApiServices: "bitty.services, Notify & State",
    docTitleApiSystem: "Core System APIs (Terminal, FS, Env, Tasks)",

    // Site Footer
    footerTagline: "Microkernel GPU Terminal Emulator",
    footerDocLink: "Documentation",
    footerManualLink: "Manual CDN (R2)",
    footerSummary:
      "Bitty Terminal · Microkernel Architecture · Pure-Rust Stackless Lua Sandbox (Phodopus — Piccolo Fork).",
    footerProvenancePrefix: "Canonical docs owned by",
    footerCorpusSetPrefix: "Corpus set:",
    footerRenderedEdge: "Rendered at Edge via Cloudflare Workers.",
  },
  "zh-CN": {
    // Site Header & Controls
    searchPlaceholder: "搜索官方文档 (Ctrl+K)...",
    themeLight: "☀️ 浅色",
    themeDark: "🌙 深色",
    navDocs: "文档",

    // Hero Section
    heroBadge1: "★ GPU 加速 · RUST 微内核架构",
    heroBadge2: "PHODOPUS (PICCOLO FORK) · 0B 空闲沙箱",
    heroTitle: "极简微内核 · 高度可编程终端工作区平台",
    heroLede:
      "Bitty 坚守“极简微内核、强稳定 API、一切皆可组合、扩展定义体验”的架构哲学。内核专注极致 PTY 与 GPU 硬件加速渲染，界面排版与工作流交由沙箱化 Phodopus (Piccolo Fork) 运行时与原生协进程自由塑形，零后台守护进程常驻。",
    getBittyBtn: "安装 Bitty ⚡",
    exploreDocsBtn: "浏览官方文档 →",

    // Install Deck
    installDeckBadge: "快速安装",
    installDeckChecksum: "SHA-256 校验和 ↗",
    tabPackages: "安装包",
    copyBtnLabel: "复制",
    copiedBtnLabel: "已复制!",
    installHintUnix: "Linux & macOS: 自动拉取已验证的 .tar.zst 二进制包",
    installHintWin: "Windows: PowerShell 单行命令安装便携二进制（用户本地）",
    installHintPkg:
      "发行版包管理器: Arch (AUR), Debian/Ubuntu (.deb), Fedora (.rpm), openSUSE, Alpine, NixOS, Flatpak",
    installHintCargo: "从源码编译: 通过 Cargo 与锁定工具链 (+1.98.1) 本地构建",
    installHintDefault: "自动化安装脚本 · 官方校验和已验证",
    directBinariesTitle: "★ R2 官方构建包与发行版安装包:",
    statusReady: "● 官方就绪",
    directMatrixLink: "发行版矩阵 ↓",
    directPkgPortable: "(便携版)",

    // Showcase Stage
    showcaseReel1Tab: "01 Dwindle 平铺与面板",
    showcaseReel2Tab: "02 浮动输入窗口 (Alt+E)",
    showcaseReel3Tab: "03 Phodopus 沙箱与协进程",
    showcaseReel4Tab: "演示素材槽位 (GIF/视频)",
    showcaseDprIndicator: "High-DPR 120 FPS 高帧率",
    showcaseGpuIndicator: "wgpu 硬件加速 (Vulkan / Metal / DX12)",
    showcaseWindowTitle: "bitty — 工作区 1:开发 (dwindle 平铺)",
    showcasePtyTag: "面板 #1 · PTY 终端流 (t:1)",
    showcasePtyFocus: "当前聚焦 · 边框高亮",
    showcasePtyFooterNote: "微内核解耦视图容器",
    showcasePtyFooterTick: "0.42ms 帧耗时",
    showcaseGuiTag: '面板 #2 · LUA GUI 视图 (type="rich")',
    showcaseGuiDesc:
      "面板不局限于 PTY 字符流。可直接在 Hyprland 平铺网格中挂载声明式 bitty.ui 组件树：",
    showcaseCoprocessLabel: "上游协进程:",
    showcaseConfinementLabel: "沙箱隔离级别:",
    showcaseSplitTag: "面板 #3 · DWINDLE 分屏 (t:2)",
    showcaseComposerTitle: "浮动输入窗口 · 64 KiB 缓冲暂存区",
    showcaseComposerDesc:
      "带语法高亮的多行输入暂存器。回车直传当前活跃 PTY 会话，或按 Esc 关闭取消。",
    showcaseComposerHint: "Enter 提交发送 · Esc 取消关闭",
    showcaseComposerSubmit: "ENTER 发送至 PTY",
    showcaseComposerDismiss: "ESC 取消关闭",
    showcaseArchTitle: "bitty — 微内核三层架构拓扑",
    showcaseArchLayerDownstream: "下游扩展层",
    showcaseArchLayerCore: "核心引擎",
    showcaseArchLayerUpstream: "上游原生协进程",
    showcaseArchDownstreamDesc:
      "无栈燃料计量 VM，补全原生 require 模块链、模式匹配与 32 MiB 硬内存配额；保持 0 字节空闲开销。",
    showcaseArchCoreDesc:
      "纯 Rust 微内核：wgpu 合成器、状态机与 VT 解析器彻底解耦，热路径零动态分配。扩展沙箱绝不直接触碰解析器。",
    showcaseArchUpstreamDesc:
      "零后台守护进程常驻。基于 stdio Wire v1 协议的原生瞬态协进程，采用 Landlock 沙箱隔离，重型负载安全解耦。",

    // Linux Distro Matrix
    linuxEcosystemBadge: "LINUX 发行版生态",
    linuxEcosystemSubtitle: "★ 全主流 Linux 发行版与包管理器原生支持",
    linuxMatrixTitle: "全主流 Linux 发行版支持矩阵",
    linuxMatrixDesc:
      "无论是前沿滚动的 Arch、CachyOS，还是企业级稳定的 Debian、Ubuntu、Fedora、openSUSE，亦或是轻量 musl 系统（Alpine）与纯净重现式构建（NixOS）——Bitty 原生兼容一切。",
    statNativeRust: "100% 纯 RUST 原生",
    statPackages: "12 种打包格式",
    statIdleMem: "0B 空闲内存占用",
    filterAll: "全格式 (12)",
    filterArch: "Arch / CachyOS",
    filterDebian: "Debian / Ubuntu",
    filterFedora: "Fedora / RHEL",
    filterSuse: "openSUSE",
    filterAlpine: "Alpine (musl)",
    filterNix: "NixOS",
    filterSource: "Void & Gentoo",
    filterUniversal: "通用格式 (AppImage / Flatpak / Snap)",
    distroArchLabel: "架构:",
    distroDirectLabel: "安装包直链:",
    distroStatusReady: "● 官方支持",
    distroCopyBtn: "复制",
    distroAltLabel: "备选:",
    distroViewQuick: "⚡ 快捷单行命令",
    distroViewAll: "📋 全部发行版列表",
    distroActiveDistroLabel: "当前发行版安装包:",

    // 12 Distro Descriptions
    distroDescArch:
      "AUR 自动化打包构建，针对 x86-64-v3/v4 硬件指令集专属优化，实现极速冷启动与 0B 空闲 Phodopus (Piccolo Fork) 内存开销。",
    distroDescDebian:
      "官方签名 .deb 安装包，提供完整的桌面环境集成、systemd 用户服务钩子以及 Wayland 会话自动检测。",
    distroDescFedora:
      "Fedora 与企业级 Linux 自动化 COPR 构建，严格适配 SELinux 安全策略，支持全硬件 Vulkan/Wayland 加速。",
    distroDescSuse:
      "面向 openSUSE 规范打包，兼容事物型系统更新（Transactional Updates）与 YaST 集成，已通过 Tumbleweed 滚动版验证。",
    distroDescAlpine:
      "采用 musl 纯静态编译链接，极致小巧。专为超低开销开发容器与移动 Linux 环境量身打造。",
    distroDescNix:
      "完全密封（Hermetic）且可重现的 Nix 构建。可在 NixOS 配置或 home-manager flake 中以声明式导入 Bitty，杜绝依赖泄露。",
    distroDescVoid:
      "Void Linux 原生安装包，集成轻量 runit 服务文件，绝不依赖 systemd。全面提供 glibc 与 musl 双版本支持。",
    distroDescGentoo:
      "源码级优化 ebuild 脚本，提供精细化 USE 标记配置，自由定制 Wayland、Vulkan 后端、Phodopus (Piccolo Fork) Lua 虚拟机及协进程运行时。",
    distroDescAppImage:
      "单文件独立运行包，内嵌所有 Wayland、Vulkan 与图形依赖库。免安装、免 root 提权，下载即可直接运行。",
    distroDescFlatpak:
      "桌面沙箱化分发，预置 Wayland 显示与 PipeWire Portal 权限，是不可变发行版（Immutable OS）的绝佳选择。",
    distroDescSnap:
      "采用 Classic 隔离模式的通用 Snap 软件包。支持后台自动无缝更新、桌面环境深度集成且无动态库冲突。",
    distroDescTarball:
      "采用超快 Zstandard 算法压缩的免安装独立二进制包。解压至 ~/.local/bin 即可无特权直接运行。",

    // Bento Architecture Pillars
    pillarsTitle: "专为高度组合与沙箱隔离设计",
    pillarsSubtitle:
      "拒绝单体臃肿设计。Bitty 将终端渲染核心与扩展业务逻辑彻底分离，坚守终端事实。",
    bentoStage1Tag: "阶段 01",
    bento1Badge: "终端事实与平铺合成",
    bento1Title: "Hyprland 平铺 × 终端绝对事实",
    bento1Desc:
      "严格解耦 Terminal（PTY 终端事实）、View（图元呈现）与 Layout（合成器）。Dwindle 平铺分屏与亚像素平滑间距，热路径零阻塞。",
    bento1BtnLabel: "查看工作区规范",
    bentoStage2Tag: "阶段 02",
    bento2Badge: "PHODOPUS 沙箱与 WIRE V1",
    bento2Title: "Phodopus (Piccolo Fork) × 原生协进程",
    bento2Desc:
      "基于 kyren/piccolo 深度定制的独立沙箱运行时（Phodopus），补全了原生 require 模块链、标准模式匹配、32 MiB 硬性内存配额与指令燃料熔断，保持 0 字节空闲开销；重型能力通过 stdio Wire v1 原生协进程安全解耦。",
    bento2BtnLabel: "查看架构规范",
    bentoStage3Tag: "阶段 03",
    bento3Badge: "声明式热重载与弹性回滚",
    bento3Title: "声明式配置管线 × 弹性安全回滚",
    bento3Desc:
      "全声明式 ~/.config/bitty/init.lua，运行时平滑热重载而不中断活跃 PTY 会话；异常配置原子回滚，并提供 bitty --safe 应急安全模式。",
    bento3BtnLabel: "查看配置参考",
    bentoOpenDoc: "查阅文档 →",

    // Documentation Index
    manualTitle: "Bitty 官方手册与指南",
    manualSubtitle:
      "官方用户手册、配置规范与 Lua API 文档，通过 Cloudflare R2 极速直连分发。",
    manualSecGettingStarted: "快速入门",
    manualSecConfiguration: "配置规范",
    manualSecPlugins: "插件与架构",
    manualSecApi: "LUA API 参考",
    manualDocsCount: "篇文档",

    // Localized Doc Titles on Index
    docTitleQuickstart: "快速入门指南",
    docTitleCli: "CLI 命令与控制",
    docTitleConfigOverview: "配置规范总览",
    docTitleWorkspaces: "工作区与面板设置",
    docTitleActions: "核心动作目录",
    docTitlePluginStart: "插件开发快速入门",
    docTitleBarModules: "状态栏模块使用指南",
    docTitleComposer: "浮动输入窗口用法",
    docTitlePluginConfig: "独立插件配置文件",
    docTitleCapabilities: "插件能力与沙箱隔离",
    docTitleNativeComponents: "原生组件与协进程",
    docTitleApiOverview: "API 架构与设计规范",
    docTitleApiUi: "bitty.ui 视图组件树",
    docTitleApiCommands: "bitty.commands 命令绑定",
    docTitleApiPanel: "bitty.panel 面板管理",
    docTitleApiServices: "bitty.services 系统服务",
    docTitleApiSystem: "核心底层系统接口",

    // Site Footer
    footerTagline: "微内核 GPU 终端模拟器",
    footerDocLink: "官方文档",
    footerManualLink: "官方手册 CDN (R2)",
    footerSummary:
      "Bitty 终端 · 微内核架构 · 纯 Rust 栈无关 Lua 沙箱 (Phodopus — Piccolo Fork)。",
    footerProvenancePrefix: "官方规范文档归属",
    footerCorpusSetPrefix: "语料集校验:",
    footerRenderedEdge: "由 Cloudflare Workers 边缘极速渲染。",
  },
};
