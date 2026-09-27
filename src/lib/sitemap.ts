/**
 * Published-only sitemap emission (Website Delivery RFC MV-6, website#97).
 *
 * The sitemap is derived from the built output, not from a second eligibility
 * rule: every URL it lists is an HTML page the build actually emitted for a
 * hosted version segment. Pages the publication policy excludes
 * (`./publicationPolicy.ts`) emit no page at all — they ship a 301 instead —
 * so they cannot appear here, and redirect stubs (legacy aliases) are skipped
 * because a canonical sitemap lists destinations, not redirects.
 *
 * Two artifacts per build:
 * - `dist/sitemap.xml` — the global sitemap. It lists the home page plus the
 *   canonical (`latest`) routes only, so one document has one canonical URL.
 * - `dist/docs/<segment>/sitemap.xml` — the per-version sitemap, listing the
 *   routes hosted under that segment.
 *
 * Fail closed: a hosted version segment with no pages aborts the build rather
 * than shipping an empty sitemap.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";

import { isRedirectStub } from "./a11yAudit.ts";

export const SITEMAP_FILENAME = "sitemap.xml";

const INDEX_FILE = "index.html";
const HTML_SUFFIX = ".html";
const DOCS_DIR = "docs";

export type SitemapCounts = {
  /** URLs in the global `dist/sitemap.xml`. */
  readonly canonical: number;
  /** URLs per hosted version segment, keyed by segment. */
  readonly perVersion: Readonly<Record<string, number>>;
};

async function collectHtmlPaths(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relative =
        prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), relative);
      } else if (entry.isFile() && entry.name.endsWith(HTML_SUFFIX)) {
        found.push(relative);
      }
    }
  }
  await walk(root, "");
  return found;
}

/**
 * Dist-relative HTML path -> public route path.
 *
 * @throws for a path that is not an `index.html` page (the static build emits
 *   directory routes only)
 */
export function routePathFromDistPath(relativePath: string): string {
  if (relativePath === INDEX_FILE) return "/";
  if (!relativePath.endsWith(`/${INDEX_FILE}`)) {
    throw new Error(
      `Sitemap: expected a directory index page, got "${relativePath}"`,
    );
  }
  return `/${relativePath.slice(0, -INDEX_FILE.length)}`;
}

/**
 * Route paths of every rendered page under `prefix` (a dist-relative
 * directory), sorted. Redirect stubs are skipped: a stub is a redirect, and
 * the sitemap lists canonical destinations.
 */
async function routesUnder(
  outDir: string,
  prefix: string,
): Promise<readonly string[]> {
  const root = prefix.length === 0 ? outDir : join(outDir, prefix);
  let relativePaths: string[];
  try {
    relativePaths = await collectHtmlPaths(root);
  } catch (error) {
    // A hosted segment with no directory at all emitted no page; the caller
    // turns that into a fail-closed error with a useful message.
    if ((error as { code?: string }).code === "ENOENT") return [];
    throw error;
  }
  const routes: string[] = [];
  for (const relative of relativePaths) {
    if (!relative.endsWith(`${sep}${INDEX_FILE}`) && relative !== INDEX_FILE) {
      continue;
    }
    const distPath = prefix.length === 0 ? relative : `${prefix}/${relative}`;
    const normalized = distPath.split(sep).join("/");
    if (isRedirectStub(await readFile(join(root, relative), "utf8"))) continue;
    routes.push(routePathFromDistPath(normalized));
  }
  return routes.sort();
}

/** Deterministic `sitemap.xml` for `origin` and the given route paths. */
export function renderSitemap(
  origin: string,
  routePaths: readonly string[],
): string {
  const base = origin.replace(/\/+$/u, "");
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routePaths.map((route) => `  <url><loc>${base}${route}</loc></url>`),
    "</urlset>",
  ];
  return `${lines.join("\n")}\n`;
}

/**
 * Write the global and per-version sitemaps into the static output and return
 * the URL counts. `hostedVersions` are the route segments the build emitted
 * (for example `latest`, `stable`, `0.1.0`); `canonicalVersion` is the single
 * segment the global sitemap lists.
 *
 * @throws when a hosted version emitted no page (fail closed)
 */
export async function writeSitemaps(
  outDir: string,
  meta: {
    readonly origin: string;
    readonly hostedVersions: readonly string[];
    readonly canonicalVersion: string;
  },
): Promise<SitemapCounts> {
  const canonicalRoutes = await routesUnder(outDir, "");
  const perVersion: Record<string, number> = {};
  for (const segment of meta.hostedVersions) {
    const routes = await routesUnder(outDir, `${DOCS_DIR}/${segment}`);
    if (routes.length === 0) {
      throw new Error(
        `Sitemap: hosted version "${segment}" emitted no page under ${DOCS_DIR}/${segment}/`,
      );
    }
    await mkdir(join(outDir, DOCS_DIR, segment), { recursive: true });
    await writeFile(
      join(outDir, DOCS_DIR, segment, SITEMAP_FILENAME),
      renderSitemap(meta.origin, routes),
      "utf8",
    );
    perVersion[segment] = routes.length;
  }

  const prefix = `/${DOCS_DIR}/${meta.canonicalVersion}/`;
  const globalRoutes = canonicalRoutes.filter(
    (route) => route === "/" || route.startsWith(prefix),
  );
  await writeFile(
    join(outDir, SITEMAP_FILENAME),
    renderSitemap(meta.origin, globalRoutes),
    "utf8",
  );
  return { canonical: globalRoutes.length, perVersion };
}

/** Route paths listed in a rendered sitemap, for the dist gate. */
export function sitemapRoutes(xml: string): readonly string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => {
    const url = match[1] ?? "";
    const path = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/iu, "");
    return path.length === 0 ? "/" : path;
  });
}
