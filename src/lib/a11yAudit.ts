/**
 * Accessibility-audit asset policy and rendered-page discovery.
 *
 * The build keeps its output text-only. Raster image payloads must come from
 * the documented CDN origin or an inline data URI, while the small set of
 * bundled vector formats is allowed by policy. Every URL-bearing attribute and
 * every srcset candidate is classified independently so a later local
 * candidate cannot hide behind an earlier CDN candidate.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { CDN_BASE_URL } from "./cdn.ts";

const CDN_URL_PREFIX = `${CDN_BASE_URL}/`;
const DATA_URI_SCHEME = "data:";
const HTML_FILE_EXTENSION = ".html";

/** Policy-approved bundled vector formats. */
export const BUNDLED_VECTOR_EXTENSIONS = [".svg", ".svgz"] as const;

/** Known raster formats, all of which must be CDN-hosted or inline. */
export const RASTER_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".bmp",
  ".ico",
  ".tiff",
] as const;

const VECTOR_EXTENSION_SET = new Set<string>(BUNDLED_VECTOR_EXTENSIONS);
const RASTER_EXTENSION_SET = new Set<string>(RASTER_EXTENSIONS);
const SRCSET_ATTRIBUTES = new Set(["srcset", "data-srcset"]);

export type AssetReferenceKind =
  "data-uri" | "cdn" | "bundled-vector" | "raster" | "unknown";

export type AssetReference = {
  readonly element: string;
  readonly attribute: string;
  readonly value: string;
  readonly kind: AssetReferenceKind;
  readonly allowed: boolean;
};

export type DisallowedAssetReference = AssetReference & {
  readonly reason: string;
};

export type RenderedPage = {
  readonly path: string;
  readonly relativePath: string;
  readonly redirectStub: boolean;
  /**
   * Upstream raw-HTML passthrough (currently `architecture/interactive/`):
   * a standalone app mirrored verbatim, not rendered through the site
   * template. Site-chrome checks (skip link, footer, focus target) do not
   * apply; asset policy still applies but reports warn-only because the
   * source lives upstream.
   */
  readonly passthrough: boolean;
};

/** Relative dist paths rendered outside the site template. */
export const PASSTHROUGH_PATH_SEGMENT = "architecture/interactive/";

function elementTag(source: string, tagName: string): string {
  return source
    .slice(0, source.indexOf(tagName) + tagName.length)
    .toLowerCase();
}

/**
 * Parse the opening tag and quoted attributes needed by the asset policy.
 * The generated pages use ordinary quoted HTML, so malformed unquoted
 * attributes are rejected by producing no value rather than being guessed.
 */
function attributesInTag(
  source: string,
  tagNameEnd: number,
): Map<string, string> {
  const tagEnd = source.indexOf(">", tagNameEnd);
  if (tagEnd < 0) {
    return new Map();
  }
  const tagSource = source.slice(tagNameEnd, tagEnd);
  const attributes = new Map<string, string>();
  const pattern = /\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
  let match = pattern.exec(tagSource);
  while (match !== null) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3];
    if (name !== undefined && value !== undefined) {
      attributes.set(name, value);
    }
    match = pattern.exec(tagSource);
  }
  return attributes;
}

/**
 * Extract URL candidates from srcset/image-set values.
 *
 * Commas separate candidates, while commas may also appear inside a URL.
 * The final whitespace-delimited token is the descriptor. Removing that
 * descriptor leaves the URL, including any embedded comma.
 */
export function srcsetCandidates(value: string): readonly string[] {
  const candidates: string[] = [];
  for (const rawCandidate of value.split(",")) {
    const candidate = rawCandidate.trim();
    if (candidate.length === 0) {
      continue;
    }
    const lastSpace = candidate.lastIndexOf(" ");
    const url =
      lastSpace < 0 ? candidate : candidate.slice(0, lastSpace).trim();
    if (url.length > 0) {
      candidates.push(url);
    }
  }
  return candidates;
}

function pathExtension(candidate: string): string {
  let path = candidate;
  const schemeMatch = /^[a-z][a-z0-9+.-]*:/i.exec(candidate);
  if (schemeMatch !== null) {
    const scheme = schemeMatch[0].toLowerCase();
    if (scheme !== "http:" && scheme !== "https:") {
      return "";
    }
    try {
      const url = new URL(candidate);
      path = url.pathname;
    } catch {
      return "";
    }
  } else {
    const queryIndex = path.search(/[?#]/);
    if (queryIndex >= 0) {
      path = path.slice(0, queryIndex);
    }
  }
  const lastSlash = path.lastIndexOf("/");
  const fileName = lastSlash < 0 ? path : path.slice(lastSlash + 1);
  const lastDot = fileName.lastIndexOf(".");
  return lastDot < 0 ? "" : fileName.slice(lastDot).toLowerCase();
}

/** Classify one URL-bearing value under the bundled-raster policy. */
export function classifyAssetReference(candidate: string): AssetReferenceKind {
  const normalized = candidate.trim();
  if (normalized.toLowerCase().startsWith(DATA_URI_SCHEME)) {
    return "data-uri";
  }
  if (normalized.startsWith(CDN_URL_PREFIX)) {
    return "cdn";
  }
  const extension = pathExtension(normalized);
  if (VECTOR_EXTENSION_SET.has(extension)) {
    return "bundled-vector";
  }
  if (RASTER_EXTENSION_SET.has(extension)) {
    return "raster";
  }
  return "unknown";
}

function isAllowedKind(kind: AssetReferenceKind): boolean {
  return kind === "data-uri" || kind === "cdn" || kind === "bundled-vector";
}

/**
 * Inspect every URL-bearing attribute on every relevant media element.
 * Both single-URL and srcset attributes are expanded into independent
 * references; one rejected candidate rejects the complete page.
 */
export function findDisallowedAssetReferences(
  html: string,
): readonly DisallowedAssetReference[] {
  const problems: DisallowedAssetReference[] = [];
  const pattern = /<(img|picture|source|video|audio|canvas)\b[^>]*>/gi;
  let match = pattern.exec(html);
  while (match !== null) {
    const element = elementTag(match[0], match[1] ?? "");
    const attributes = attributesInTag(match[0], element.length);
    for (const [attribute, rawValue] of attributes) {
      if (
        attribute !== "src" &&
        attribute !== "srcset" &&
        attribute !== "poster" &&
        attribute !== "data-src" &&
        attribute !== "data-srcset"
      ) {
        continue;
      }
      const candidates = SRCSET_ATTRIBUTES.has(attribute)
        ? srcsetCandidates(rawValue)
        : [rawValue];
      for (const candidate of candidates) {
        const kind = classifyAssetReference(candidate);
        if (!isAllowedKind(kind)) {
          problems.push({
            element,
            attribute,
            value: candidate,
            kind,
            allowed: false,
            reason:
              kind === "raster"
                ? "bundled raster images are not allowed"
                : "unknown bundled asset format is not allowed",
          });
        }
      }
    }
    match = pattern.exec(html);
  }
  return problems;
}

/** Redirect stubs count toward the HTML denominator but skip content checks. */
export function isRedirectStub(html: string): boolean {
  return (
    /<meta[^>]*http-equiv\s*=\s*["']?refresh/i.test(html) ||
    /Redirecting (to|from)/.test(html)
  );
}

export type BrokenInternalLink = {
  readonly href: string;
  readonly resolved: string;
};

/**
 * Find site-internal doc links whose target has no rendered page.
 *
 * Pure function over one page: `relativePath` is the `dist`-relative path of
 * the page holding `html`, `knownPages` is the full set of `dist`-relative
 * HTML paths (redirect stubs included — a stub is a shipped route, not a
 * dead link). Only `href`s that resolve under `docs/` are considered; the
 * site chrome, home page, external URLs, anchors, and non-doc routes are out
 * of scope. Query strings and fragments are stripped before comparison.
 * A trailing slash resolves to that directory's `index.html`, matching the
 * `[...slug]` static output.
 */
export function findBrokenInternalLinks(
  html: string,
  relativePath: string,
  knownPages: ReadonlySet<string>,
): readonly BrokenInternalLink[] {
  const broken: BrokenInternalLink[] = [];
  const pageDir = relativePath.includes("/")
    ? relativePath.slice(0, relativePath.lastIndexOf("/") + 1)
    : "";
  const pattern = /<a\b[^>]*\bhref\s*=\s*"([^"]*)"/gi;
  let match = pattern.exec(html);
  while (match !== null) {
    const rawHref = match[1] ?? "";
    const href = rawHref.split("#")[0]?.split("?")[0] ?? "";
    match = pattern.exec(html);
    if (href.length === 0) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("mailto:")) {
      continue;
    }
    const resolved = href.startsWith("/")
      ? href.slice(1)
      : normalizeDocPath(pageDir + href);
    if (!resolved.startsWith("docs/")) continue;
    // File references (CHANGELOG.md, diagrams.css, data.json, sub-page .html
    // of upstream passthrough apps) are not doc routes: upstream authors link
    // them for the repository view, and the site never renders them as pages.
    // Only extensionless route-style links are dead-link candidates.
    const leaf = resolved.endsWith("/")
      ? ""
      : (resolved.split("/").pop() ?? "");
    if (leaf.includes(".")) continue;
    const target = resolved.endsWith("/")
      ? `${resolved}index.html`
      : `${resolved}/index.html`;
    if (!knownPages.has(target)) {
      broken.push({ href: rawHref, resolved: target });
    }
  }
  return broken;
}

/**
 * Collapse `.`/`..` segments of a `/`-joined relative path.
 */
function normalizeDocPath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

/**
 * Static docs-shell checks (CTX-0050): the defects the shell rework fixes
 * must not be able to come back silently.
 *
 * Evaluated per rendered docs page, over the built HTML only:
 * - the article body must not repeat the page title (website#74: the leading
 *   `# <title>` heading used to survive demotion as an `h2`),
 * - exactly one element carries `aria-current="page"` (website#78: the
 *   version switcher used to add a second one),
 * - the sidebar renders at most two list levels (website#96: no third
 *   level, ever),
 * - the breadcrumb landmark is present.
 *
 * The caller scopes this to rendered docs pages; redirect stubs and
 * passthrough mirrors have no shell.
 */
export type DocsShellDefect = {
  readonly kind: "title-echo" | "aria-current" | "sidebar-depth" | "breadcrumb";
  readonly detail: string;
};

const H1_PATTERN = /<h1\b[^>]*>([\s\S]*?)<\/h1>/iu;
const ARTICLE_PATTERN = /<article\b[^>]*>([\s\S]*?)<\/article>/iu;
const BODY_HEADING_PATTERN = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/iu;
const SIDEBAR_PATTERN =
  /<nav\b[^>]*class="[^"]*docs-sidebar[^"]*"[^>]*>([\s\S]*?)<\/nav>/iu;
const ARIA_CURRENT_PAGE_PATTERN = /<[a-z][^>]*\saria-current="page"/giu;

function textContent(source: string): string {
  return source
    .replace(/<[^>]*>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Deepest `<ul>` nesting inside the sidebar navigation. */
export function sidebarListDepth(html: string): number {
  const sidebar = SIDEBAR_PATTERN.exec(html);
  if (sidebar === null || sidebar[1] === undefined) {
    return 0;
  }
  let depth = 0;
  let current = 0;
  const tokenPattern = /<\/?ul\b/giu;
  let match = tokenPattern.exec(sidebar[1]);
  while (match !== null) {
    current += match[0].startsWith("</") ? -1 : 1;
    depth = Math.max(depth, current);
    match = tokenPattern.exec(sidebar[1]);
  }
  return depth;
}

/** Number of elements claiming to be the current page. */
export function pageAriaCurrentCount(html: string): number {
  return (html.match(ARIA_CURRENT_PAGE_PATTERN) ?? []).length;
}

/** `true` when the article body opens with a heading that repeats the `h1`. */
export function repeatsPageTitle(html: string): boolean {
  const heading = H1_PATTERN.exec(html);
  const article = ARTICLE_PATTERN.exec(html);
  if (heading === null || article === null || article[1] === undefined) {
    return false;
  }
  const body = BODY_HEADING_PATTERN.exec(article[1]);
  if (body === null || body[2] === undefined) {
    return false;
  }
  const title = textContent(heading[1] ?? "");
  return title.length > 0 && textContent(body[2]) === title;
}

export function auditDocsShell(html: string): readonly DocsShellDefect[] {
  const defects: DocsShellDefect[] = [];
  if (repeatsPageTitle(html)) {
    defects.push({
      kind: "title-echo",
      detail: "article body repeats the page h1 as its first heading",
    });
  }
  const current = pageAriaCurrentCount(html);
  if (current !== 1) {
    defects.push({
      kind: "aria-current",
      detail: `expected exactly one aria-current="page", found ${current}`,
    });
  }
  const depth = sidebarListDepth(html);
  if (depth > 2) {
    defects.push({
      kind: "sidebar-depth",
      detail: `sidebar renders ${depth} nested list levels (two-layer ceiling)`,
    });
  }
  if (!html.includes('aria-label="Breadcrumb"')) {
    defects.push({
      kind: "breadcrumb",
      detail: "breadcrumb landmark missing",
    });
  }
  return defects;
}

async function collectHtmlPaths(root: string): Promise<string[]> {
  const paths: string[] = [];
  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(HTML_FILE_EXTENSION)) {
        paths.push(path);
      }
    }
  }
  await walk(root);
  return paths;
}

/**
 * Recursively read every HTML artifact. The returned records preserve the
 * full denominator, including redirect stubs excluded from content checks.
 */
export async function collectRenderedPages(
  root: string,
): Promise<readonly RenderedPage[]> {
  const pages: RenderedPage[] = [];
  for (const path of (await collectHtmlPaths(root)).sort()) {
    const html = await readFile(path, "utf8");
    const relativePath = relative(root, path).split(sep).join("/");
    pages.push({
      path,
      relativePath,
      redirectStub: isRedirectStub(html),
      passthrough: relativePath.includes(PASSTHROUGH_PATH_SEGMENT),
    });
  }
  return pages;
}
