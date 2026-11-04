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
  readonly slug: string;
  readonly fullSlug: string;
  readonly name: string;
  readonly summary: string;
  readonly status: ExtensionStatus;
  readonly version: string | null;
  readonly href: string;
}

export interface PluginEntry {
  readonly id: string;
  readonly name: string;
  readonly href: string;
}

export interface ExtensionCatalog {
  readonly native: readonly ExtensionCard[];
  readonly plugins: readonly PluginEntry[];
}

/** Entries that describe the catalog itself rather than an extension. */
const NON_EXTENSION_SLUGS = new Set(["overview", "upstream-components"]);
const PLUGIN_CATALOG_PAGE = "plugins/getting-started.md";
const SUMMARY_LIMIT = 170;
const INSTALL_STATUS_HEADING = /^##\s+(?:Install status|安装状态)\s*$/mu;

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

  const native = entries
    .filter(
      (entry) =>
        entry.sectionId === "extensions" &&
        !NON_EXTENSION_SLUGS.has(entry.slug),
    )
    .map((entry) => {
      const markdown = readPage(locale, entry.path, baseDir);
      return {
        slug: entry.slug,
        fullSlug: entry.fullSlug,
        name: displayName(entry.title),
        summary: extractSummary(markdown),
        status: extractStatus(markdown),
        version: extractPublishedVersion(markdown),
        href: `${prefix}/${entry.fullSlug}/`,
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
        : `${prefix}/plugins/getting-started/`,
    };
  });

  return { native, plugins };
}
