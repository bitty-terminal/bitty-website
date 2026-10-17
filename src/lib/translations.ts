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
    manualTitle: "Bitty 官方手册与指南",
    manualSubtitle:
      "官方用户手册、配置规范与 Lua API 文档，通过 Cloudflare R2 极速直连分发。",
  },
};
