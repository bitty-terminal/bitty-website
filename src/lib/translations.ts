// src/lib/translations.ts
// Home & Hero i18n dictionaries for English (en) and Simplified Chinese (zh-CN).

export type SupportedLang = "en" | "zh-CN";

export interface Translations {
  heroBadge1: string;
  heroBadge2: string;
  heroTitle: string;
  heroLede: string;
  getBittyBtn: string;
  exploreDocsBtn: string;
  installDeckBadge: string;
  installDeckChecksum: string;
  installHintUnix: string;
  installHintWin: string;
  installHintPkg: string;
  installHintCargo: string;
  installHintDefault: string;
  directBinariesTitle: string;
  statusReady: string;
  directMatrixLink: string;
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
  pillarsTitle: string;
  pillarsSubtitle: string;
  bento1Badge: string;
  bento1Title: string;
  bento1Desc: string;
  bento2Badge: string;
  bento2Title: string;
  bento2Desc: string;
  bento3Badge: string;
  bento3Title: string;
  bento3Desc: string;
  comparisonBadge: string;
  comparisonTitle: string;
  comparisonSubtitle: string;
  compColFeature: string;
  compColBitty: string;
  compColAlacritty: string;
  compColWezTerm: string;
  compColWarp: string;
  compRow1Name: string;
  compRow1Bitty: string;
  compRow1Alacritty: string;
  compRow1WezTerm: string;
  compRow1Warp: string;
  compRow2Name: string;
  compRow2Bitty: string;
  compRow2Alacritty: string;
  compRow2WezTerm: string;
  compRow2Warp: string;
  compRow3Name: string;
  compRow3Bitty: string;
  compRow3Alacritty: string;
  compRow3WezTerm: string;
  compRow3Warp: string;
  compRow4Name: string;
  compRow4Bitty: string;
  compRow4Alacritty: string;
  compRow4WezTerm: string;
  compRow4Warp: string;
  compRow5Name: string;
  compRow5Bitty: string;
  compRow5Alacritty: string;
  compRow5WezTerm: string;
  compRow5Warp: string;
  compRow6Name: string;
  compRow6Bitty: string;
  compRow6Alacritty: string;
  compRow6WezTerm: string;
  compRow6Warp: string;
  manualTitle: string;
  manualSubtitle: string;
}

export const translations: Record<SupportedLang, Translations> = {
  en: {
    heroBadge1: "★ GPU-ACCELERATED · RUST MICROKERNEL",
    heroBadge2: "PHODOPUS (PICCOLO FORK) · 0B IDLE SANDBOX",
    heroTitle: "SMALL CORE. HIGHLY PROGRAMMABLE TERMINAL PLATFORM.",
    heroLede:
      'Bitty is built on a timeless tenet: "Small core. Stable API. Everything composable. Extensions own the experience." A pure Rust microkernel preserves terminal truth and blazing GPU throughput, while sandboxed Phodopus (Piccolo Fork) and native coprocesses shape your ideal workspace—with zero background daemons.',
    getBittyBtn: "Get Bitty ⚡",
    exploreDocsBtn: "Explore Docs →",
    installDeckBadge: "QUICK INSTALL",
    installDeckChecksum: "SHA-256 CHECKSUMS ↗",
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
    pillarsTitle: "Engineered for Composability & Isolation",
    pillarsSubtitle:
      "Zero monolithic bloat. Bitty separates terminal mechanics from extension policy.",
    bento1Badge: "TERMINAL TRUTH & TILING",
    bento1Title: "Hyprland Tiling × Terminal Truth",
    bento1Desc:
      "Strict separation between Terminal (canonical PTY state), View (presentation), and Layout (compositor). Dwindle & BSP binary trees with sub-pixel borders that never block hot paths.",
    bento2Badge: "PHODOPUS & WIRE V1",
    bento2Title: "Phodopus (Piccolo Fork) × Native Coprocesses",
    bento2Desc:
      "Independent sandbox-first runtime forked from Piccolo — complete with require module chains, pattern matching, fuel metering, and 32 MiB hard quotas at 0-byte idle memory; heavy workloads isolate safely over stdio Wire v1.",
    bento3Badge: "CONFIGPLAN & RESILIENCE",
    bento3Title: "Declarative ConfigPlan & Safe Recovery",
    bento3Desc:
      "Instant ~/.config/bitty/init.lua reconciliation without dropping active PTY sessions, atomic schema rollback, and emergency bitty --safe recovery mode.",
    comparisonBadge: "TERMINAL MATRIX",
    comparisonTitle: "Why Bitty? Architectural Positioning Matrix",
    comparisonSubtitle:
      "How Bitty's small microkernel and programmable platform compare to classic and modern terminal emulators.",
    compColFeature: "Architectural Dimension",
    compColBitty: "Bitty (Platform)",
    compColAlacritty: "Alacritty (Minimal)",
    compColWezTerm: "WezTerm (Monolith)",
    compColWarp: "Warp (Cloud/Closed)",
    compRow1Name: "Core Positioning",
    compRow1Bitty:
      "Programmable Terminal Platform (Emacs-level customizability with Rust crash isolation)",
    compRow1Alacritty: "Bare single-pane terminal emulator with zero scripting",
    compRow1WezTerm: "Feature-rich terminal with large monolithic footprint",
    compRow1Warp: "Closed-source, cloud-bound commercial AI terminal",
    compRow2Name: "Kernel & State",
    compRow2Bitty:
      "Pure-Rust Microkernel: Terminal Truth strictly decoupled from Views and Layout",
    compRow2Alacritty:
      "Monolithic pure-Rust terminal engine with single window",
    compRow2WezTerm:
      "Monolithic Rust GUI integrating terminal, multiplexer, and GUI",
    compRow2Warp: "Closed-source custom client with web/cloud integrations",
    compRow3Name: "Extension Runtime",
    compRow3Bitty:
      "Phodopus (Piccolo Fork) 0B idle sandbox + stdio Wire v1 native coprocesses",
    compRow3Alacritty: "None (extensions intentionally excluded)",
    compRow3WezTerm: "Embedded full Lua 5.4 runtime (resident memory overhead)",
    compRow3Warp: "Proprietary extension store with closed extensions",
    compRow4Name: "Tiling & Panels",
    compRow4Bitty:
      "Native GPU Hyprland dwindle tiling + declarative Rich GUI Panels",
    compRow4Alacritty: "Single pane only (requires external tmux / zellij)",
    compRow4WezTerm: "Built-in tabs, panes, and floating splits",
    compRow4Warp: "Block-based terminal interface with pane splits",
    compRow5Name: "Daemons & Privacy",
    compRow5Bitty: "Zero background daemons, 100% local-first, zero telemetry",
    compRow5Alacritty: "Zero daemons, 100% local-first, zero telemetry",
    compRow5WezTerm:
      "Optional GUI multiplexer daemon, local-first, zero telemetry",
    compRow5Warp:
      "Mandatory background helpers, requires account login & telemetry",
    compRow6Name: "Crash & Fault Isolation",
    compRow6Bitty:
      "Hard isolation: plugin / coprocess crashes never bring down the core terminal",
    compRow6Alacritty: "N/A (no plugin subsystem)",
    compRow6WezTerm:
      "Lua script errors can block or crash the main GUI event loop",
    compRow6Warp: "Commercial crash reporting to cloud services",
    manualTitle: "Bitty Manual & Guides",
    manualSubtitle:
      "Official user manual, configuration reference, and Lua API documentation served directly from Cloudflare R2.",
  },
  "zh-CN": {
    heroBadge1: "★ GPU 加速 · RUST 微内核架构",
    heroBadge2: "PHODOPUS (PICCOLO FORK) · 0B 空闲沙箱",
    heroTitle: "极简微内核 · 高度可编程终端工作区平台",
    heroLede:
      "Bitty 坚守“极简微内核、强稳定 API、一切皆可组合、扩展定义体验”的架构哲学。内核专注极致 PTY 与 GPU 硬件加速渲染，界面排版与工作流交由沙箱化 Phodopus (Piccolo Fork) 运行时与原生协进程自由塑形，零后台守护进程常驻。",
    getBittyBtn: "安装 Bitty ⚡",
    exploreDocsBtn: "浏览官方文档 →",
    installDeckBadge: "快速安装",
    installDeckChecksum: "SHA-256 校验和 ↗",
    installHintUnix: "Linux & macOS: 自动拉取已验证的 .tar.zst 二进制包",
    installHintWin: "Windows: PowerShell 单行命令安装便携二进制（用户本地）",
    installHintPkg:
      "发行版包管理器: Arch (AUR), Debian/Ubuntu (.deb), Fedora (.rpm), openSUSE, Alpine, NixOS, Flatpak",
    installHintCargo: "从源码编译: 通过 Cargo 与锁定工具链 (+1.98.1) 本地构建",
    installHintDefault: "自动化安装脚本 · 官方校验和已验证",
    directBinariesTitle: "★ R2 官方构建包与发行版安装包:",
    statusReady: "● 就绪",
    directMatrixLink: "发行版矩阵 ↓",
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
    pillarsTitle: "专为高度组合与沙箱隔离设计",
    pillarsSubtitle:
      "拒绝单体臃肿设计。Bitty 将终端渲染核心与扩展业务逻辑彻底分离，坚守终端事实。",
    bento1Badge: "终端事实与平铺合成",
    bento1Title: "Hyprland 平铺 × 终端绝对事实",
    bento1Desc:
      "严格解耦 Terminal（PTY 终端事实）、View（图元呈现）与 Layout（合成器）。Dwindle 平铺分屏与亚像素平滑间距，热路径零阻塞。",
    bento2Badge: "PHODOPUS 沙箱与 WIRE V1",
    bento2Title: "Phodopus (Piccolo Fork) × 原生协进程",
    bento2Desc:
      "基于 kyren/piccolo 深度定制的独立沙箱运行时（Phodopus），补全了原生 require 模块链、标准模式匹配、32 MiB 硬性内存配额与指令燃料熔断，保持 0 字节空闲开销；重型能力通过 stdio Wire v1 原生协进程安全解耦。",
    bento3Badge: "声明式热重载与弹性回滚",
    bento3Title: "声明式配置管线 × 弹性安全回滚",
    bento3Desc:
      "全声明式 ~/.config/bitty/init.lua，运行时平滑热重载而不中断活跃 PTY 会话；异常配置原子回滚，并提供 bitty --safe 应急安全模式。",
    comparisonBadge: "终端定位矩阵",
    comparisonTitle: "为什么选择 Bitty？终端定位与架构对比",
    comparisonSubtitle:
      "横向对比 Bitty 微内核可编程平台与传统及现代终端模拟器的设计哲学与技术权衡。",
    compColFeature: "架构与设计维度",
    compColBitty: "Bitty (终端平台)",
    compColAlacritty: "Alacritty (极简)",
    compColWezTerm: "WezTerm (重型单体)",
    compColWarp: "Warp (闭源云端)",
    compRow1Name: "核心定位",
    compRow1Bitty: "轻量可编程终端平台（Emacs 级高定制性与 Rust 内存隔离）",
    compRow1Alacritty: "极简单窗格终端模拟器，无脚本扩展生态",
    compRow1WezTerm: "大单体多功能终端，配置自由但体积庞大",
    compRow1Warp: "商业闭源、强绑定云端账号的 AI 终端",
    compRow2Name: "内核架构与状态",
    compRow2Bitty: "纯 Rust 微内核：终端事实与视图/布局严格解耦，热路径零阻塞",
    compRow2Alacritty: "纯 Rust 单体引擎，无内置多窗格复合合成器",
    compRow2WezTerm: "庞大 Rust 单体，终端、多路复用器与渲染界面高度耦合",
    compRow2Warp: "闭源客户端架构，依赖专有前端渲染管线",
    compRow3Name: "扩展运行时与沙箱",
    compRow3Bitty:
      "Phodopus (Piccolo Fork) 0B 空闲沙箱 + stdio Wire v1 原生协进程",
    compRow3Alacritty: "无扩展支持（刻意排除脚本与插件能力）",
    compRow3WezTerm: "内嵌完整 Lua 5.4 运行时（常驻内存开销较大）",
    compRow3Warp: "闭源私有扩展机制，不支持用户底层自由 hack",
    compRow4Name: "平铺与窗口布局",
    compRow4Bitty: "原生 GPU 级 Hyprland dwindle 平铺 + 通用可编程 Rich Panel",
    compRow4Alacritty: "仅支持单窗格（依赖外部 tmux 或 zellij）",
    compRow4WezTerm: "内置 Tab 与 Pane 拆分，基于字符网格切分",
    compRow4Warp: "基于块（Block）的界面排版与窗口拆分",
    compRow5Name: "常驻守护与隐私",
    compRow5Bitty: "零后台守护进程常驻，100% 本地优先，绝对零遥测追踪",
    compRow5Alacritty: "零守护进程，100% 本地优先，无遥测",
    compRow5WezTerm: "可选 mux 后台守护进程，本地优先，无遥测",
    compRow5Warp: "强制后台辅助进程常驻，强依赖云端登录与遥测采集",
    compRow6Name: "故障与崩溃隔离",
    compRow6Bitty:
      "强隔离：插件沙箱或协进程崩溃绝不波及主终端，PTY 会话始终安全",
    compRow6Alacritty: "无插件系统（无扩展故障面）",
    compRow6WezTerm: "Lua 脚本异常可能阻塞或导致主 GUI 事件循环崩溃",
    compRow6Warp: "商业托管，崩溃错误回传至官方云端服务",
    manualTitle: "Bitty 官方手册与指南",
    manualSubtitle:
      "官方用户手册、配置规范与 Lua API 文档，通过 Cloudflare R2 极速直连分发。",
  },
};
