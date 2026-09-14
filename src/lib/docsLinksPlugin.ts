/**
 * Sätteri mdast plugin wiring version-aware link rewriting (MV-4) into the
 * Astro Markdown pipeline.
 *
 * Registered in `astro.config.mjs` via
 * `markdown.processor: satteri({ mdastPlugins: [...] })`. Sätteri runs the
 * plugin once per Markdown document at build time with the document's
 * `fileURL` on the visitor context, from which the `docs/...` source path is
 * derived. The pure rewrite lives in `./docsLinks.ts` (unit-tested); this
 * module only adapts mdast nodes to it.
 *
 * `image` nodes are intentionally untouched: Astro's asset pipeline already
 * bundles relative images. `link` and `definition` (reference-style) nodes
 * are rewritten through `rewriteDocsHref`.
 *
 * Fail-closed: a document outside the mirror root, or a reference whose
 * rewrite fails unexpectedly, throws with the source path attached instead
 * of shipping raw relative references. Documents that are not routable at
 * all (outside the mapper's categories) are skipped: they can never become
 * pages, since the renderer and sync/check reject them first.
 */

import { statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { rewriteDocsHref } from "./docsLinks.ts";
import { sourcePathToRouteIdentity } from "./docsRoutes.ts";

/** Minimal structural mdast node surface this plugin reads and writes. */
export type DocsLinkNode = {
  readonly type: string;
  readonly url?: string;
};

/** Minimal structural visitor-context surface this plugin uses. */
export type DocsLinkContext = {
  readonly fileURL: URL | undefined;
  setProperty(node: object, key: string, value: string): void;
};

export type DocsLinksPluginOptions = {
  /** Absolute loader base, e.g. `<root>/src/content/docs`. */
  readonly mirrorRoot: string;
};

export type DocsLinksPlugin = {
  readonly name: string;
  link(node: DocsLinkNode, ctx: DocsLinkContext): void;
  definition(node: DocsLinkNode, ctx: DocsLinkContext): void;
};

/** `docs/...`-relative source path for a compiled document URL. */
export function sourcePathForFileURL(
  fileURL: URL | undefined,
  mirrorRoot: string,
): string {
  if (fileURL === undefined) {
    throw new Error("bitty-docs-links: document has no fileURL");
  }
  const absolute = fileURLToPath(fileURL);
  const rel = relative(mirrorRoot, absolute).split(sep).join("/");
  if (rel.length === 0 || rel.startsWith("..")) {
    throw new Error(
      `bitty-docs-links: document ${absolute} is outside the mirror root ${mirrorRoot}`,
    );
  }
  return rel;
}

export function docsLinksMdastPlugin(
  options: DocsLinksPluginOptions,
): DocsLinksPlugin {
  const { mirrorRoot } = options;
  const dirCache = new Map<string, boolean>();
  const routableCache = new Map<string, boolean>();
  const isDirectory = (docsRelativePath: string): boolean => {
    const cached = dirCache.get(docsRelativePath);
    if (cached !== undefined) return cached;
    let result = false;
    try {
      result = statSync(join(mirrorRoot, docsRelativePath)).isDirectory();
    } catch {
      result = false;
    }
    dirCache.set(docsRelativePath, result);
    return result;
  };

  const rewrite = (node: DocsLinkNode, ctx: DocsLinkContext): void => {
    const url = node.url;
    if (typeof url !== "string" || url.length === 0) return;
    const sourcePath = sourcePathForFileURL(ctx.fileURL, mirrorRoot);
    // Documents outside the routable categories (e.g. website_publish:false
    // notes under docs/sources/) never become pages: the renderer and
    // sync/check reject them through the same mapper, so there is nothing to
    // rewrite. Skip instead of failing documents that can never ship.
    let routable = routableCache.get(sourcePath);
    if (routable === undefined) {
      try {
        sourcePathToRouteIdentity(sourcePath);
        routable = true;
      } catch {
        routable = false;
      }
      routableCache.set(sourcePath, routable);
    }
    if (!routable) return;
    let next: string | null;
    try {
      next = rewriteDocsHref(sourcePath, url, { isDirectory });
    } catch (error) {
      throw new Error(
        `bitty-docs-links: ${sourcePath}: ${(error as Error).message}`,
      );
    }
    if (next !== null && next !== url) {
      ctx.setProperty(node, "url", next);
    }
  };

  return {
    name: "bitty-docs-links",
    link: rewrite,
    definition: rewrite,
  };
}
