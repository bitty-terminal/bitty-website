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
  readonly href: string;
}

export interface ExtensionCatalog {
  readonly native: readonly ExtensionCard[];
  readonly plugins: readonly ExtensionCard[];
}

/** Entries that describe the catalog itself rather than an extension. */
const NON_EXTENSION_SLUGS = new Set(["overview", "upstream-components"]);
const PLUGIN_SLUG_PREFIX = "catalog-";
const SUMMARY_LIMIT = 170;

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[`*_]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
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
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Publication marker from the `## Install status` callout. */
export function extractStatus(markdown: string): ExtensionStatus {
  const section = markdown.match(
    /^##\s+(?:Install status|安装状态)\s*$([\s\S]*?)(?=^##\s|$(?![\s\S]))/mu,
  )?.[1];
  if (!section) return "unknown";
  if (/^\s*>\s*\**\s*(?:Published|已发布)/mu.test(section)) {
    return "published";
  }
  if (/^\s*>\s*\**\s*(?:Unpublished|未发布)/mu.test(section)) {
    return "unpublished";
  }
  return "unknown";
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
        href: `${prefix}/${entry.fullSlug}/`,
      };
    });

  const plugins = entries
    .filter(
      (entry) =>
        entry.sectionId === "plugins" &&
        entry.slug.startsWith(PLUGIN_SLUG_PREFIX),
    )
    .map((entry) => {
      const markdown = readPage(locale, entry.path, baseDir);
      return {
        slug: entry.slug,
        fullSlug: entry.fullSlug,
        name: displayName(entry.title),
        summary: extractSummary(markdown),
        status: extractStatus(markdown),
        href: `${prefix}/${entry.fullSlug}/`,
      };
    });

  return { native, plugins };
}
