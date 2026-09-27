/**
 * Rendered docs entry derivation shared by the docs shell components
 * (CTX-0050).
 *
 * The sidebar, breadcrumbs, and previous/next pager must agree on the same
 * entry set and on the same canonical slug for every page, so the
 * collection -> entry mapping lives here once instead of being re-derived per
 * component. Slugs come from the authoritative route mapper
 * (`./docsRoutes.ts`, RM-6); publication filtering follows LD-3
 * (`website_publish` only).
 *
 * The pure helpers keep the structural surface they read (`id`, `filePath`,
 * `data`) so they stay unit-testable without an Astro runtime.
 */

import { sep } from "node:path";

import { sourcePathToRouteIdentity } from "./docsRoutes.ts";
import type { SidebarEntry } from "./docsSidebar.ts";

/**
 * Path invariant locating the pinned docs mirror inside the project
 * (`<root>/src/content/docs/`). `import.meta.url` points at the compiled
 * chunk during `astro build`, so the mirror is found by this invariant rather
 * than relative to a module that no longer sits next to it.
 */
export const MIRROR_MARKER = "src/content/docs/";

/** Fields this module reads from a `docs` collection entry. */
export type DocsEntryLike = {
  readonly id: string;
  readonly filePath?: string | undefined;
  readonly data: {
    readonly title: string;
    readonly sidebar_order: number;
    readonly website_publish: boolean;
  };
};

/** Repo-relative source path (`docs/<category>/<path>.md`) of a mirror entry. */
export function sourcePathFromFilePath(filePath: string, id: string): string {
  const posix = filePath.split(sep).join("/");
  const index = posix.lastIndexOf(MIRROR_MARKER);
  if (index === -1) {
    throw new Error(
      `Docs entry "${id}" is outside ${MIRROR_MARKER}: ${filePath}`,
    );
  }
  return posix.slice(index + MIRROR_MARKER.length);
}

/** Canonical slug below `/docs/<version>/` (`""` for the revision index). */
export function slugFromSourceFile(
  filePath: string | undefined,
  id: string,
): string {
  if (filePath === undefined || filePath.length === 0) {
    throw new Error(`Docs entry "${id}" has no filePath`);
  }
  const identity = sourcePathToRouteIdentity(
    sourcePathFromFilePath(filePath, id),
  );
  const withoutDocs = identity.routeWithoutVersion.slice("/docs/".length);
  return withoutDocs.endsWith("/") ? withoutDocs.slice(0, -1) : withoutDocs;
}

/**
 * Sidebar entries for a `docs` collection: published entries only, each
 * carrying its canonical slug, canonical title, and `sidebar_order`.
 */
export function sidebarEntriesFrom(
  entries: readonly DocsEntryLike[],
): readonly SidebarEntry[] {
  return entries
    .filter((entry) => entry.data.website_publish === true)
    .map((entry) => ({
      slug: slugFromSourceFile(entry.filePath, entry.id),
      title: entry.data.title,
      order: entry.data.sidebar_order,
    }));
}
