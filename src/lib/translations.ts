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
  manualTitle: string;
  manualSubtitle: string;
}

export const translations: Record<SupportedLang, Translations> = {
  en: {
    heroBadge1: "★ GPU-ACCELERATED · RUST MICROKERNEL",
    heroBadge2: "HIGHLY EXTENSIBLE · 0B IDLE LUA VM",
    heroTitle: "TILE SHELLS & HIGHLY EXTENSIBLE LUA PANELS AT NATIVE SPEED.",
    heroLede:
      "Bitty pairs Hyprland dwindle tiling and a pure-Rust microkernel with extreme extensibility. Build declarative Piccolo Lua UI panels and native coprocesses with zero background daemons.",
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
    manualTitle: "Bitty Manual & Guides",
    manualSubtitle:
      "Official user manual, configuration reference, and Lua API documentation served directly from Cloudflare R2.",
  },
  "zh-CN": {
    heroBadge1: "★ GPU 加速 · RUST 微内核架构",
    heroBadge2: "高扩展架构 · 0B 空闲内存 LUA 沙箱",
    heroTitle: "平铺分屏与高扩展 LUA 面板，原生极速终端",
    heroLede:
      "Bitty 将 Hyprland 风格的平铺分屏、纯 Rust 微内核与高扩展性深度结合。通过沙箱隔离的 Piccolo Lua 扩展生态与原生协进程，自由定制终端界面与自动化工作流，零后台守护进程常驻。",
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
      "拒绝单体臃肿设计。Bitty 将终端渲染核心与扩展业务逻辑彻底分离。",
    manualTitle: "Bitty 官方手册与指南",
    manualSubtitle:
      "官方用户手册、配置规范与 Lua API 文档，通过 Cloudflare R2 极速直连分发。",
  },
};
