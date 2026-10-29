/**
 * Rewrite canonical-manual cross-links from source Markdown to site routes.
 *
 * The manual is authored as a Markdown tree, so its internal links are
 * relative file references (`../configuration/themes.md#tokens`). Rendered
 * verbatim they would resolve against the page URL and 404. The sync step
 * rewrites the generated copy of each entry: `.md` targets map through the
 * manifest to `${docsPrefix}/${section}/${slug}/`, fragments are preserved,
 * and an unpublished target fails closed.
 *
 * The published archive is never modified; only the generated site copy is.
 */

import { posix } from "node:path";

import {
  docsPrefix,
  getAllManualDocEntries,
  type ManualLocale,
  type ManualManifest,
} from "./manualDocs.ts";

/** Locale-relative Markdown path (no leading slash) to canonical slug. */
export type ManualPathIndex = ReadonlyMap<string, string>;

export function buildManualPathIndex(
  manifest: ManualManifest,
): ManualPathIndex {
  const index = new Map<string, string>();
  for (const entry of getAllManualDocEntries(manifest)) {
    index.set(entry.path, entry.fullSlug);
  }
  return index;
}

const EXTERNAL_SCHEME = /^[a-z][a-z0-9+.-]*:/iu;
const INLINE_LINK = /\]\(([^)\s]+)\)/gu;

/**
 * Resolve one href, or return `null` when it is not a manual cross-link that
 * needs rewriting (external URL, in-page anchor, asset reference).
 *
 * @throws when a `.md` target is not published by the manifest.
 */
export function resolveManualHref(
  href: string,
  sourcePath: string,
  locale: ManualLocale,
  index: ManualPathIndex,
): string | null {
  const value = href.trim();
  if (value.length === 0) return null;
  if (EXTERNAL_SCHEME.test(value) || value.startsWith("//")) return null;
  if (value.startsWith("#")) return null;

  const hashIndex = value.indexOf("#");
  const rawPath = hashIndex < 0 ? value : value.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? "" : value.slice(hashIndex + 1);
  if (rawPath.length === 0 || !rawPath.endsWith(".md")) return null;

  const decoded = decodeURIComponent(rawPath);
  const relative = decoded.startsWith("/")
    ? decoded.slice(1)
    : posix.join(posix.dirname(sourcePath), decoded);
  const normalized = posix.normalize(relative);
  const slug = index.get(normalized);
  if (slug === undefined) {
    throw new Error(
      `manual link target is not published: "${href}" from "${sourcePath}"`,
    );
  }
  const suffix = fragment.length === 0 ? "" : `#${fragment}`;
  return `${docsPrefix(locale)}/${slug}/${suffix}`;
}

/**
 * Rewrite every inline link in one Markdown document, skipping fenced code
 * blocks and inline code spans so examples stay verbatim.
 */
export function rewriteManualLinks(
  markdown: string,
  sourcePath: string,
  locale: ManualLocale,
  index: ManualPathIndex,
): string {
  let fence: string | null = null;
  const lines = markdown.split("\n").map((line) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/u);
    if (fenceMatch !== null) {
      const marker = fenceMatch[1] ?? "";
      if (fence === null) fence = marker;
      else if (marker.startsWith(fence[0] ?? "")) fence = null;
      return line;
    }
    if (fence !== null) return line;

    const segments = line.split("`");
    const rewritten = segments.map((segment, position) => {
      // Odd positions are inside inline code spans.
      if (position % 2 === 1) return segment;
      return segment.replace(INLINE_LINK, (match, target: string) => {
        const next = resolveManualHref(target, sourcePath, locale, index);
        return next === null ? match : `](${next})`;
      });
    });
    return rewritten.join("`");
  });
  return lines.join("\n");
}
