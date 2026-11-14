import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  docsPrefix,
  getAllManualDocEntries,
  loadManualManifest,
  type ManualLocale,
} from "./manualDocs.ts";

export type ExtensionStatus = "published" | "unpublished" | "unknown";

export interface ExtensionCard {
  readonly id: string;
  readonly slug: string;
  readonly fullSlug: string;
  readonly name: string;
  readonly title: string;
  readonly summary: string;
  readonly status: ExtensionStatus;
  readonly statusLabel: string;
  readonly version: string | null;
  readonly href: string;
  readonly repoUrl: string;
}

export interface PluginEntry {
  readonly id: string;
  readonly name: string;
  readonly href: string;
}

export interface OfficialLuaPlugin {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly title: string;
  readonly version: string;
  readonly compat: string;
  readonly featured: boolean;
  readonly capabilities: readonly string[];
  readonly summary: string;
  readonly href: string;
  readonly manualHref: string;
  readonly repoUrl: string;
  readonly registryUrl: string;
}

export interface ExtensionCatalog {
  readonly native: readonly ExtensionCard[];
  readonly nativeExtensions: readonly ExtensionCard[];
  readonly plugins: readonly PluginEntry[];
  readonly luaPlugins: readonly OfficialLuaPlugin[];
}

/** Entries that describe the catalog itself rather than an extension. */
const NON_EXTENSION_SLUGS = new Set(["overview", "upstream-components"]);
const PLUGIN_CATALOG_PAGE = "plugins/getting-started.md";
const SUMMARY_LIMIT = 170;
const INSTALL_STATUS_HEADING = /^##\s+(?:Install status|安装状态)\s*$/mu;

const NATIVE_EXTENSION_TITLES: Readonly<
  Record<string, { readonly en: string; readonly "zh-CN": string }>
> = {
  a11y: { en: "Accessibility Bridge", "zh-CN": "无障碍辅助桥接" },
  agent: { en: "Agent Protocol", "zh-CN": "智能体通信协议" },
  ai: { en: "AI Runtime Host", "zh-CN": "AI 运行时宿主" },
  execution: { en: "Execution Supervisor", "zh-CN": "进程与作业监管器" },
  graphics: { en: "Inline Graphics", "zh-CN": "内联图像解码与光栅" },
  ipc: { en: "IPC Transport", "zh-CN": "跨进程通信传输层" },
  network: { en: "Network Client", "zh-CN": "受控网络传输栈" },
  observability: { en: "Observability & Audit", "zh-CN": "可观测性与审计链" },
  "platform-services": {
    en: "Platform Services",
    "zh-CN": "系统传感器与设备服务",
  },
  storage: { en: "Local Storage Engine", "zh-CN": "本地持久化存储引擎" },
  "url-detector": { en: "URL Detector", "zh-CN": "终端 URL 识别引擎" },
};

interface RawOfficialPluginMeta {
  readonly id: string;
  readonly slug: string;
  readonly version: string;
  readonly compat: string;
  readonly featured: boolean;
  readonly capabilities: readonly string[];
  readonly title: { readonly en: string; readonly "zh-CN": string };
  readonly summary: { readonly en: string; readonly "zh-CN": string };
  readonly manualAnchor?: string;
}

const OFFICIAL_LUA_PLUGINS_META: readonly RawOfficialPluginMeta[] = [
  {
    id: "bitty-terminal.bar",
    slug: "bar",
    version: "0.0.1",
    compat: ">=0.0.24",
    featured: true,
    capabilities: [
      "ui.rich",
      "ui.overlay",
      "workspace.read",
      "workspace.control",
    ],
    title: {
      en: "Unified Bar",
      "zh-CN": "统一状态与标签栏 (Bar)",
    },
    summary: {
      en: "Consolidated workspace bar, interactive tabs, and modular statusline widgets (CPU, memory, battery, network, audio spectrum) over generic chrome insets.",
      "zh-CN":
        "整合工作区标签栏与模块化状态栏组件（CPU、内存、电池、网络、音频频谱），基于通用窗口内边距声明式渲染。",
    },
  },
  {
    id: "bitty-terminal.dashboard",
    slug: "dashboard",
    version: "0.3.0",
    compat: ">=0.0.31",
    featured: true,
    capabilities: ["runtime.inspect", "ui.overlay.focus", "config.manage"],
    title: {
      en: "Runtime Dashboard",
      "zh-CN": "运行时配置与遥测面板 (Dashboard)",
    },
    summary: {
      en: "Live configuration, diagnostics, and telemetry overlay: inspect runtime state, plugins, native extensions, profiles, and preview token-bound setting edits.",
      "zh-CN":
        "实时配置、诊断与遥测覆盖层面板：查看运行时快照、插件与原生扩展状态、配置文件，并支持带确认令牌的设置预览与修改。",
    },
    manualAnchor: "#the-dashboard-panel",
  },
  {
    id: "bitty-terminal.palette",
    slug: "palette",
    version: "0.0.1",
    compat: ">=0.0.24",
    featured: true,
    capabilities: ["ui.overlay.focus"],
    title: {
      en: "Command Palette",
      "zh-CN": "命令面板与选择器 (Palette)",
    },
    summary: {
      en: "Fuzzy command palette and interactive picker rendered in the focusable overlay slot using purely declarative scene primitives.",
      "zh-CN":
        "挂载于可聚焦覆盖层插槽的模糊搜索命令面板与交互式选择器，完全采用声明式场景原语构建。",
    },
  },
  {
    id: "bitty-featured.devtools",
    slug: "devtools",
    version: "0.2.0",
    compat: ">=0.0.21",
    featured: true,
    capabilities: [
      "debug.inspect",
      "debug.trace",
      "platform.notify",
      "ui.rich",
    ],
    title: {
      en: "Bitty DevTools",
      "zh-CN": "插件运行时调试器 (DevTools)",
    },
    summary: {
      en: "Read-only inspection and bounded event-bus tracing for the Bitty plugin runtime: audit VM lifecycles, capability grants, and live event streams.",
      "zh-CN":
        "针对 Bitty 插件运行时的只读状态检查与有界事件总线追踪工具：审计 VM 生命周期、权限授予记录及实时事件流。",
    },
  },
  {
    id: "bitty-featured.activity",
    slug: "activity",
    version: "0.0.1",
    compat: ">=0.0.24",
    featured: true,
    capabilities: ["terminal.semantic-read", "platform.notify"],
    title: {
      en: "Bitty Activity",
      "zh-CN": "本地终端活动时间线 (Activity)",
    },
    summary: {
      en: "Privacy-first local activity timeline aggregating session durations, working directories, and command counts without ever storing raw command arguments.",
      "zh-CN":
        "隐私优先的本地活动时间线插件，聚合会话时长、工作目录与命令频次统计，绝不记录原始命令参数。",
    },
  },
  {
    id: "bitty-terminal.beacon",
    slug: "beacon",
    version: "0.0.1",
    compat: ">=0.0.31",
    featured: false,
    capabilities: [
      "ui.rich",
      "ui.overlay",
      "ui.overlay.focus",
      "workspace.read",
      "workspace.control",
    ],
    title: {
      en: "Beacon Spatial Jump",
      "zh-CN": "空间提示符跳转与面板调度 (Beacon)",
    },
    summary: {
      en: "Spatial and semantic workspace targeting policy with keyboard hint labels for instant pane focus, workspace jumps, and panel movement.",
      "zh-CN":
        "基于公共目标定位与标签分配 API 的空间与语义工作区导航插件，提供键盘提示标签以快速聚焦、跳转或移动分屏。",
    },
  },
  {
    id: "bitty-terminal.composer",
    slug: "composer",
    version: "0.0.1",
    compat: ">=0.0.21",
    featured: false,
    capabilities: [
      "ui.overlay.focus",
      "terminal.input.submit",
      "process.editor",
    ],
    title: {
      en: "Command Composer",
      "zh-CN": "多行命令编辑器 (Composer)",
    },
    summary: {
      en: "Modal multi-line command buffer with chord routing, bracketed-paste PTY submission, and allowlisted external editor ($EDITOR) round-trip.",
      "zh-CN":
        "模态多行命令编辑缓冲区，支持快捷键路由、受控括号粘贴提交，以及白名单外部编辑器（nvim/vim/vi）往返编辑。",
    },
  },
  {
    id: "bitty-terminal.copy-mode",
    slug: "copy-mode",
    version: "0.0.1",
    compat: ">=0.0.24",
    featured: false,
    capabilities: ["history.transcript.read", "clipboard.write"],
    title: {
      en: "Copy Mode",
      "zh-CN": "键盘可视选择与复制模式 (Copy Mode)",
    },
    summary: {
      en: "Modal keyboard-driven visual selection over bounded, redacted transcript snapshots with cursor/anchor navigation and grant-gated clipboard yank.",
      "zh-CN":
        "基于有界、已脱敏终端历史快照的模态键盘可视选择插件，支持锚点/光标范围选择与权限门控的剪贴板复制。",
    },
  },
  {
    id: "bitty-terminal.file-manager",
    slug: "file-manager",
    version: "0.1.0",
    compat: ">=0.0.24",
    featured: false,
    capabilities: ["terminal.semantic-read", "ui.rich", "fs.read:**"],
    title: {
      en: "File Manager",
      "zh-CN": "只读目录浏览与预览 (File Manager)",
    },
    summary: {
      en: "Bounded read-only directory listing, path navigation, and file preview synchronized with the active terminal pane's working directory.",
      "zh-CN":
        "与当前终端分屏工作目录同步的有界只读目录列表、路径导航与文件预览面板。",
    },
  },
  {
    id: "bitty-terminal.git-panel",
    slug: "git-panel",
    version: "0.1.0",
    compat: ">=0.0.24",
    featured: false,
    capabilities: [
      "ui.overlay.focus",
      "terminal.semantic-read",
      "process.spawn:git",
    ],
    title: {
      en: "Git Panel",
      "zh-CN": "Git 仓库状态与差异面板 (Git Panel)",
    },
    summary: {
      en: "Read-only Git branch, working-tree status, diff, and commit log overlay backed by allowlisted read-only git subcommands.",
      "zh-CN":
        "基于白名单只读 git 子命令的仓库分支、工作树状态、差异对比（Diff）与提交日志（Log）覆盖层面板。",
    },
  },
  {
    id: "bitty-terminal.help",
    slug: "help",
    version: "0.0.1",
    compat: ">=0.0.31",
    featured: false,
    capabilities: [
      "runtime.keymaps.read",
      "ui.rich",
      "ui.overlay",
      "ui.present",
    ],
    title: {
      en: "Keymap Help & Which-Key",
      "zh-CN": "快捷键速查与提示层 (Help)",
    },
    summary: {
      en: "Non-modal shortcut overlay and which-key helper rendered directly from the live host keymap registry without seizing keyboard focus.",
      "zh-CN":
        "基于宿主实时快捷键注册表的非模态快捷键速查与按键提示覆盖层，无需抢占键盘输入焦点。",
    },
  },
  {
    id: "bitty-terminal.history",
    slug: "history",
    version: "0.0.1",
    compat: ">=0.0.24",
    featured: false,
    capabilities: [
      "history.transcript.read",
      "history.commands.read",
      "history.kv.read",
      "ui.overlay.focus",
    ],
    title: {
      en: "History Keeper",
      "zh-CN": "终端输出与命令历史检索 (History)",
    },
    summary: {
      en: "Opt-in bounded snapshot queries across sealed terminal transcripts, shell command history, and plugin KV namespaces with automatic secret redaction.",
      "zh-CN":
        "针对已封存终端输出记录、命令历史与插件键值命名空间的受控快照检索工具，内置自动敏感信息脱敏。",
    },
  },
  {
    id: "bitty-terminal.search",
    slug: "search",
    version: "0.0.1",
    compat: ">=0.0.24",
    featured: false,
    capabilities: ["history.transcript.read"],
    title: {
      en: "Scrollback Search",
      "zh-CN": "回滚缓冲区搜索 (Search)",
    },
    summary: {
      en: "Fast, bounded scrollback search over persisted terminal transcripts with match navigation and capability-gated selection export.",
      "zh-CN":
        "在持久化终端回滚记录上执行快速、有界的关键字搜索，支持匹配项上下跳转与受权限门控的选区导出。",
    },
  },
];

function installStatusSection(markdown: string): string | null {
  const heading = markdown.match(INSTALL_STATUS_HEADING);
  if (heading?.index === undefined) return null;
  const remainder = markdown.slice(heading.index + heading[0].length);
  const nextHeading = remainder.search(/^##\s/mu);
  return nextHeading === -1 ? remainder : remainder.slice(0, nextHeading);
}

function stripMarkdown(text: string): string {
  // Code spans carry identifiers; keep their contents byte-for-byte.
  const codeSpans: string[] = [];
  const guarded = text.replace(/`([^`]+)`/gu, (_match, code: string) => {
    codeSpans.push(code);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });
  const plain = guarded
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/(\*\*|__)(.*?)\1/gu, "$2")
    .replace(/(\*|_)(?=\S)(.*?)(?<=\S)\1/gu, "$2")
    .replace(/\s+/gu, " ")
    .trim();
  return plain.replace(
    /\u0000(\d+)\u0000/gu,
    (_match, index: string) => codeSpans[Number(index)] ?? "",
  );
}

/** First prose paragraph of a manual page, trimmed to one sentence. */
export function extractSummary(markdown: string): string {
  const body = markdown.replace(/^#\s+.+$/mu, "");
  const paragraph = body
    .split(/\n\s*\n/u)
    .map((block) => block.trim())
    .find(
      (block) =>
        block.length > 0 &&
        !block.startsWith("-") &&
        !block.startsWith(">") &&
        !block.startsWith("|") &&
        !block.startsWith("```") &&
        !block.startsWith("##"),
    );
  if (!paragraph) return "";
  const firstSentence = paragraph.split(/(?<=\.)\s/gu)[0] ?? paragraph;
  const summary = stripMarkdown(firstSentence);
  if (summary.length <= SUMMARY_LIMIT) return summary;
  const cut = summary.slice(0, SUMMARY_LIMIT);
  const boundary = cut.lastIndexOf(" ");
  return `${boundary > 0 ? cut.slice(0, boundary) : cut}…`;
}

/** Publication marker from the `## Install status` callout. */
export function extractStatus(markdown: string): ExtensionStatus {
  const section = installStatusSection(markdown);
  if (!section) return "unknown";
  if (/^\s*>\s*\**\s*(?:Published|已发布)/mu.test(section)) {
    return "published";
  }
  if (/^\s*>\s*\**\s*(?:Unpublished|未发布)/mu.test(section)) {
    return "unpublished";
  }
  return "unknown";
}

export function formatStatusLabel(
  status: ExtensionStatus,
  locale: ManualLocale,
): string {
  const isZh = locale === "zh-CN";
  if (status === "published") {
    return isZh ? "已发布" : "Published";
  }
  if (status === "unpublished") {
    return isZh ? "未发布 (源码可审)" : "Source Verified";
  }
  return isZh ? "规范文档" : "Specification";
}

/** Exact version named by a published status callout, if any. */
export function extractPublishedVersion(markdown: string): string | null {
  if (extractStatus(markdown) !== "published") return null;
  const section = installStatusSection(markdown) ?? "";
  return section.match(/`[a-z0-9-]+ (\d+\.\d+\.\d+)`/iu)?.[1] ?? null;
}

/** Official plugin ids from the manual's catalog table, in table order. */
export function extractOfficialPluginIds(markdown: string): string[] {
  return [
    ...markdown.matchAll(/^\|\s*`(bitty-[a-z0-9-]+\.[a-z0-9-]+)`\s*\|/gmu),
  ].map((match) => match[1] as string);
}

function displayName(title: string): string {
  return title.replace(/\s+\([^)]*\)$/u, "").trim();
}

function readPage(locale: ManualLocale, path: string, baseDir: string): string {
  return readFileSync(join(baseDir, locale, path), "utf8");
}

/** Native extensions and Lua plugins documented by the pinned manual. */
export function getExtensionCatalog(
  locale: ManualLocale,
  baseDir = join(process.cwd(), "src/content/manual"),
): ExtensionCatalog {
  const manifest = loadManualManifest();
  const prefix = docsPrefix(locale);
  const entries = getAllManualDocEntries(manifest);
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));

  const native: ExtensionCard[] = entries
    .filter(
      (entry) =>
        entry.sectionId === "extensions" &&
        !NON_EXTENSION_SLUGS.has(entry.slug),
    )
    .map((entry) => {
      const markdown = readPage(locale, entry.path, baseDir);
      const status = extractStatus(markdown);
      const shortName = displayName(entry.title);
      return {
        id: entry.slug,
        slug: entry.slug,
        fullSlug: entry.fullSlug,
        name: shortName,
        title: NATIVE_EXTENSION_TITLES[entry.slug]?.[locale] ?? shortName,
        summary: extractSummary(markdown),
        status,
        statusLabel: formatStatusLabel(status, locale),
        version: extractPublishedVersion(markdown),
        href: `${prefix}/${entry.fullSlug}/`,
        repoUrl: `https://github.com/bitty-terminal/bitty-${entry.slug}`,
      };
    });

  // The official id table is locale-independent; some translations omit it,
  // so fall back to the English page rather than rendering an empty list.
  let pluginIds = extractOfficialPluginIds(
    readPage(locale, PLUGIN_CATALOG_PAGE, baseDir),
  );
  if (pluginIds.length === 0 && locale !== "en") {
    pluginIds = extractOfficialPluginIds(
      readPage("en", PLUGIN_CATALOG_PAGE, baseDir),
    );
  }
  const plugins = pluginIds.map((id) => {
    const name = id.slice(id.indexOf(".") + 1);
    const page = bySlug.get(`catalog-${name}`);
    return {
      id,
      name,
      href: page
        ? `${prefix}/${page.fullSlug}/`
        : `https://plugins.bitty.run/plugins/${id}`,
    };
  });

  const luaPlugins: OfficialLuaPlugin[] = OFFICIAL_LUA_PLUGINS_META.map(
    (meta) => {
      const manualBase = `${prefix}/plugins/getting-started/`;
      const manualHref = meta.manualAnchor
        ? `${manualBase}${meta.manualAnchor}`
        : manualBase;
      return {
        id: meta.id,
        slug: meta.slug,
        name: meta.slug,
        title: meta.title[locale],
        version: meta.version,
        compat: meta.compat,
        featured: meta.featured,
        capabilities: meta.capabilities,
        summary: meta.summary[locale],
        href: manualHref,
        manualHref,
        repoUrl: `https://github.com/bitty-terminal/${meta.slug}`,
        registryUrl: `https://plugins.bitty.run/plugins/${meta.id}`,
      };
    },
  );

  return {
    native,
    nativeExtensions: native,
    plugins,
    luaPlugins,
  };
}
