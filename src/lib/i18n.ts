/**
 * Centralized UI internationalization (i18n) dictionary and route helpers.
 *
 * Canonical documentation lives in `bitty-manual` (`en` and `zh-CN`).
 * Website-only interface strings, aria-labels, and navigation helpers live
 * here so every component renders consistent, parity-checked translations.
 */

export type SiteLocale = "en" | "zh-CN";

export const SUPPORTED_LOCALES: readonly SiteLocale[] = [
  "en",
  "zh-CN",
] as const;

export interface UiMessages {
  readonly langName: string;
  readonly switchLocaleLabel: string;
  readonly switchLocaleTitle: string;
  readonly skipToContent: string;
  readonly navAriaLabel: string;
  readonly homeAriaLabel: string;
  readonly navInstall: string;
  readonly navDocs: string;
  readonly toggleThemeLabel: string;
  readonly toggleThemeTitle: string;
  readonly githubTitle: string;
  readonly githubAriaLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly searchResultsAria: string;
  readonly searchBrowseAll: string;
  readonly heroBadge: string;
  readonly heroTitle: string;
  readonly heroSubtitle: string;
  readonly heroSubtitleLine1: string;
  readonly heroSubtitleLine2: string;
  readonly heroInstallCta: string;
  readonly heroDocsCta: string;
  readonly featuresTitle: string;
  readonly feat1Title: string;
  readonly feat1Desc: string;
  readonly feat2Title: string;
  readonly feat2Desc: string;
  readonly feat3Title: string;
  readonly feat3Desc: string;
  readonly installTitle: string;
  readonly installPointer: string;
  readonly installPackaging: string;
  readonly installPendingLabel: string;
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly extensionsTitle: string;
  readonly nativeTitle: string;
  readonly pluginTitle: string;
  readonly statusPublished: string;
  readonly statusDocs: string;
  readonly manualTitle: string;
  readonly manualSubtitle: string;
  readonly sidebarToggle: string;
  readonly sidebarAria: string;
  readonly sidebarSource: string;
  readonly sidebarPinned: string;
  readonly tocSummary: string;
  readonly toggleLeftRail: string;
  readonly toggleRightRail: string;
  readonly hideRailLabel: string;
  readonly breadcrumbAria: string;
  readonly breadcrumbRoot: string;
  readonly pagerAria: string;
  readonly pagerPrev: string;
  readonly pagerNext: string;
  readonly offlineAria: string;
  readonly offlineTitle: string;
  readonly offlineDesc: string;
  readonly footerTagline: string;
  readonly footerAria: string;
  readonly footerManual: string;
  readonly footerInstall: string;
  readonly footerManifest: string;
}

export const UI_MESSAGES: Readonly<Record<SiteLocale, UiMessages>> = {
  en: {
    langName: "EN",
    switchLocaleLabel: "Switch to Simplified Chinese (简体中文)",
    switchLocaleTitle: "阅读简体中文",
    skipToContent: "Skip to content",
    navAriaLabel: "Site navigation",
    homeAriaLabel: "Bitty home",
    navInstall: "Install",
    navDocs: "Document",
    toggleThemeLabel: "Toggle light or dark theme",
    toggleThemeTitle: "Toggle light/dark theme",
    githubTitle: "GitHub Repository",
    githubAriaLabel: "Bitty on GitHub",
    searchLabel: "Search manual",
    searchPlaceholder: "Search documentation…",
    searchResultsAria: "Search results",
    searchBrowseAll: "Browse all documentation",
    heroBadge: "GPU-Accelerated · Rust Core · Lua Runtime",
    heroTitle: "Programmable Terminal Workspace",
    heroSubtitle:
      "Lightweight Rust core with a low-latency wgpu frame pipeline, native multi-pane workspaces, and a sandboxed Lua runtime.",
    heroSubtitleLine1:
      "Lightweight Rust core with a low-latency wgpu frame pipeline,",
    heroSubtitleLine2:
      "native multi-pane workspaces, and a sandboxed Lua runtime.",
    heroInstallCta: "Install Bitty",
    heroDocsCta: "Document",
    featuresTitle: "Highlights",
    feat1Title: "GPU & Rust Core",
    feat1Desc:
      "Low-latency wgpu frame pipeline and deterministic terminal state across Linux, macOS, and Windows.",
    feat2Title: "Multi-Pane Workspaces",
    feat2Desc:
      "Native splits, tabs, and composable status bars built directly into the workspace without external multiplexers.",
    feat3Title: "Sandboxed Lua Runtime",
    feat3Desc:
      "Zero-VM lazy loading with explicit capability grants and strict instruction and memory budgets.",
    installTitle: "Install",
    installPointer: "Release pointer",
    installPackaging: "Packaging guide",
    installPendingLabel: "Pending",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Failed",
    extensionsTitle: "Extensions & Plugins",
    nativeTitle: "Native Extensions",
    pluginTitle: "Official Plugins",
    statusPublished: "Published",
    statusDocs: "Docs",
    manualTitle: "Bitty Manual",
    manualSubtitle:
      "Installation, configuration, plugin, and Lua API reference.",
    sidebarToggle: "Browse manual",
    sidebarAria: "Manual navigation",
    sidebarSource: "SOURCE",
    sidebarPinned: "R2 pinned",
    tocSummary: "On this page",
    toggleLeftRail: "Documents",
    toggleRightRail: "On this page",
    hideRailLabel: "Hide",
    breadcrumbAria: "Breadcrumb",
    breadcrumbRoot: "docs",
    pagerAria: "Pagination",
    pagerPrev: "← Previous",
    pagerNext: "Next →",
    offlineAria: "Offline documentation",
    offlineTitle: "Offline Manual Archive (Cloudflare R2)",
    offlineDesc:
      "Complete Markdown source tree and navigation manifest for this language, pinned in the build lock.",
    footerTagline: "GPU-rendered · Rust core · Sandboxed Lua",
    footerAria: "Footer navigation",
    footerManual: "Document",
    footerInstall: "Install",
    footerManifest: "R2 Manifest",
  },
  "zh-CN": {
    langName: "简体中文",
    switchLocaleLabel: "切换到英文 (English)",
    switchLocaleTitle: "Read in English",
    skipToContent: "跳转到正文",
    navAriaLabel: "站点导航",
    homeAriaLabel: "Bitty 首页",
    navInstall: "安装",
    navDocs: "文档",
    toggleThemeLabel: "切换柔和浅色或深色模式",
    toggleThemeTitle: "切换浅色/深色模式",
    githubTitle: "GitHub 仓库",
    githubAriaLabel: "Bitty GitHub 仓库",
    searchLabel: "搜索文档",
    searchPlaceholder: "搜索文档…",
    searchResultsAria: "搜索结果",
    searchBrowseAll: "浏览全部文档",
    heroBadge: "GPU 加速 · Rust 核心 · Lua 扩展",
    heroTitle: "现代可编程终端工作区",
    heroSubtitle:
      "基于轻量 Rust 核心与 wgpu 硬件加速渲染管线，内置原生多面板分屏与隔离式沙箱 Lua 扩展引擎。",
    heroSubtitleLine1: "基于轻量 Rust 核心与 wgpu 硬件加速渲染管线",
    heroSubtitleLine2: "内置原生多面板分屏与隔离式沙箱 Lua 扩展引擎",
    heroInstallCta: "安装方式",
    heroDocsCta: "阅读文档",
    featuresTitle: "核心特点",
    feat1Title: "Rust 核心与 GPU 渲染",
    feat1Desc:
      "低延迟 wgpu 渲染管线与确定性终端状态机，原生支持 Linux、macOS 与 Windows。",
    feat2Title: "多面板终端工作区",
    feat2Desc:
      "内置分屏、标签页与可组合状态栏模块，无需依赖外部终端复用器即可组织工作流。",
    feat3Title: "沙箱化 Lua 扩展",
    feat3Desc:
      "零 VM 懒加载机制，配合显式能力授权（Capabilities）与严格的指令及内存配额限制。",
    installTitle: "安装方式",
    installPointer: "最新发行指针",
    installPackaging: "完整打包说明",
    installPendingLabel: "待发布渠道",
    copy: "复制",
    copied: "已复制",
    copyFailed: "失败",
    extensionsTitle: "扩展与插件",
    nativeTitle: "原生扩展",
    pluginTitle: "官方插件",
    statusPublished: "已发布",
    statusDocs: "文档",
    manualTitle: "Bitty 手册",
    manualSubtitle: "安装、配置、插件与 Lua API 参考。",
    sidebarToggle: "浏览文档目录",
    sidebarAria: "文档导航",
    sidebarSource: "内容源",
    sidebarPinned: "R2 已锁定",
    tocSummary: "本页目录",
    toggleLeftRail: "文档列表",
    toggleRightRail: "本页目录",
    hideRailLabel: "收起",
    breadcrumbAria: "面包屑导航",
    breadcrumbRoot: "文档",
    pagerAria: "分页导航",
    pagerPrev: "← 上一篇",
    pagerNext: "下一篇 →",
    offlineAria: "离线手册",
    offlineTitle: "离线手册归档 (Cloudflare R2)",
    offlineDesc:
      "包含当前语言完整的 Markdown 源文件与导航清单，固定版本摘要记录在构建锁文件中。",
    footerTagline: "GPU 渲染 · Rust 核心 · 沙箱 Lua 扩展",
    footerAria: "页脚导航",
    footerManual: "文档",
    footerInstall: "安装",
    footerManifest: "R2 清单",
  },
};

export function getUiMessages(locale: SiteLocale = "en"): UiMessages {
  return UI_MESSAGES[locale] ?? UI_MESSAGES.en;
}

/**
 * Compute the localized path for a target locale given any site pathname.
 */
export function localizePath(
  pathname: string,
  targetLocale: SiteLocale,
): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const stripped = clean.replace(/^\/zh-CN(?=\/|$)/u, "") || "/";
  if (targetLocale === "zh-CN") {
    return stripped === "/" ? "/zh-CN/" : `/zh-CN${stripped}`;
  }
  return stripped;
}
