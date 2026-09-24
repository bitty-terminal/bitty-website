/**
 * Build-time static search index (CTX-0040).
 *
 * The Astro integration in `astro.config.mjs` calls {@link writeSearchIndex}
 * on `astro:build:done`. It scrapes only the `latest` version segment of the
 * rendered output, so each canonical article is indexed exactly once and
 * result URLs stay valid for every hosted segment (`latest`, `stable`,
 * `x.y.z`) by resolving the stored version-less slug at runtime
 * (`siteSearch.ts`). No server, no dependency, no framework lock-in: the
 * artifact is a plain JSON file served as static output.
 *
 * Fail-closed: redirect stubs and upstream passthrough apps are skipped (they
 * carry no article prose), and a page with no title or no article text aborts
 * the build instead of shipping a dead or empty search result.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";

import { PASSTHROUGH_PATH_SEGMENT, isRedirectStub } from "./a11yAudit.ts";
import type { SearchRecord } from "./siteSearch.ts";

export const SEARCH_INDEX_FILENAME = "search-index.json";

const LATEST_PREFIX = "docs/latest/";

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&#(\d+);/gu, (_match, digits: string) =>
      String.fromCodePoint(Number(digits)),
    )
    .replace(/&#x([0-9a-f]+);/giu, (_match, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16)),
    );
}

/** Collapse whitespace so prose matches query tokens predictably. */
function normalizeText(value: string): string {
  return decodeEntities(value).replace(/\s+/gu, " ").trim();
}

/**
 * Extract the visible text of the rendered article (`<article
 * class="prose">`). Script and style blocks are dropped; every other tag is
 * stripped to its text content.
 *
 * @throws when the page has no rendered article.
 */
export function extractArticleText(html: string): string {
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/iu.exec(html)?.[1];
  if (article === undefined) {
    throw new Error("Search index: page has no <article> element");
  }
  const withoutScripts = article
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ");
  return normalizeText(withoutScripts.replace(/<[^>]+>/gu, " "));
}

/** First `<h1>` text, the rendered document title. */
export function extractTitle(html: string): string {
  const raw = /<h1\b[^>]*>([\s\S]*?)<\/h1>/iu.exec(html)?.[1];
  if (raw === undefined) return "";
  return normalizeText(raw.replace(/<[^>]+>/gu, " "));
}

/** Content of `<meta name="description" content="...">`, else `""`. */
export function extractDescription(html: string): string {
  const quoted =
    /<meta\b[^>]*\bname\s*=\s*"description"[^>]*\bcontent\s*=\s*"([^"]*)"[^>]*>/iu.exec(
      html,
    )?.[1] ??
    /<meta\b[^>]*\bcontent\s*=\s*"([^"]*)"[^>]*\bname\s*=\s*"description"[^>]*>/iu.exec(
      html,
    )?.[1];
  return quoted === undefined ? "" : decodeEntities(quoted).trim();
}

/**
 * Category from the docs eyebrow (`<p class="eyebrow">category · …</p>`),
 * falling back to the head slug segment when the eyebrow is absent.
 */
export function extractCategory(html: string, slug: string): string {
  const eyebrow =
    /<p\b[^>]*\bclass\s*=\s*"[^"]*\beyebrow\b[^"]*"[^>]*>([\s\S]*?)<\/p>/iu.exec(
      html,
    )?.[1];
  if (eyebrow !== undefined) {
    const category = normalizeText(eyebrow.replace(/<[^>]+>/gu, " "))
      .split("·")[0]
      ?.trim();
    if (category !== undefined && category.length > 0) return category;
  }
  return slug.split("/")[0] ?? "";
}

/**
 * Map a `dist`-relative HTML path under `docs/latest/` to its canonical
 * version-less slug (`""` for the revision index).
 *
 * @throws for paths outside the indexed segment (fail closed).
 */
export function slugFromDistPath(relativePath: string): string {
  if (!relativePath.startsWith(LATEST_PREFIX)) {
    throw new Error(
      `Search index: expected a path under ${LATEST_PREFIX}, got "${relativePath}"`,
    );
  }
  const rest = relativePath.slice(LATEST_PREFIX.length);
  if (rest === "index.html") return "";
  if (rest.endsWith("/index.html")) return rest.slice(0, -"/index.html".length);
  throw new Error(
    `Search index: expected an index.html page, got "${relativePath}"`,
  );
}

export type IndexedInput = {
  /** `dist`-relative path, e.g. `docs/latest/specifications/foo/index.html`. */
  readonly relativePath: string;
  readonly html: string;
};

/**
 * Build version-less search records from rendered `latest` pages. Redirect
 * stubs are skipped, as are upstream passthrough apps (mirrored verbatim
 * outside the site template — indexing their inline scripts and styles would
 * pollute keyword results). Every remaining page must yield a title and
 * article text or the build fails.
 */
export function buildSearchRecords(
  pages: readonly IndexedInput[],
): readonly SearchRecord[] {
  const records: SearchRecord[] = [];
  for (const page of pages) {
    if (isRedirectStub(page.html)) continue;
    if (page.relativePath.includes(PASSTHROUGH_PATH_SEGMENT)) continue;
    const slug = slugFromDistPath(page.relativePath);
    const title = extractTitle(page.html);
    if (title.length === 0) {
      throw new Error(
        `Search index: page "${page.relativePath}" has no <h1> title`,
      );
    }
    const text = extractArticleText(page.html);
    if (text.length === 0) {
      throw new Error(
        `Search index: page "${page.relativePath}" has no article text`,
      );
    }
    records.push({
      slug,
      title,
      description: extractDescription(page.html),
      category: extractCategory(page.html, slug),
      text,
    });
  }
  records.sort(
    (left, right) =>
      left.slug.localeCompare(right.slug) ||
      left.title.localeCompare(right.title),
  );
  return records;
}

async function collectLatestPages(outDir: string): Promise<IndexedInput[]> {
  const root = join(outDir, "docs", "latest");
  const pages: IndexedInput[] = [];
  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name === "index.html") {
        const relativePath = [LATEST_PREFIX, path.slice(root.length + 1)]
          .join("")
          .split(sep)
          .join("/");
        pages.push({ relativePath, html: await readFile(path, "utf8") });
      }
    }
  }
  await walk(root);
  return pages;
}

/**
 * Write `search-index.json` into the static output directory. Returns the
 * records for logging; throws when nothing was indexed.
 */
export async function writeSearchIndex(
  outDir: string,
): Promise<readonly SearchRecord[]> {
  const records = buildSearchRecords(await collectLatestPages(outDir));
  if (records.length === 0) {
    throw new Error("Search index: no docs pages indexed under docs/latest/");
  }
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, SEARCH_INDEX_FILENAME),
    JSON.stringify(records),
    "utf8",
  );
  return records;
}
