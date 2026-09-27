/**
 * Docs navigation model (CTX-0050, website#96): two-layer reader-intent
 * sidebar, breadcrumb trail, and previous/next pager.
 *
 * Canonical data (frontmatter titles, slugs, links, pages) is never mutated
 * here — `displayTitle()` returns a derived string and every entry carries
 * both `slug` (canonical, used for links and `aria-current`) and `title`
 * (canonical) plus the derived label used for rendering.
 *
 * Sidebar shape: at most two list levels. The six reader-intent groups of
 * `./docsNavGroups.ts` are the only top level (`<ul class="docs-nav-tree">`
 * -> group `<summary>` + one `<ul>` of pages). Route depth never adds a third
 * level: a route that is both a section landing page and a container
 * (`decisions`, `projects/bitty/specifications`) is one ordinary entry
 * labelled with its real page title — the previous fixed "Contents"
 * disclosure is gone.
 *
 * Title rules (render-time only):
 * - `ADR 0003 - Core Workspace Topology` -> `Core Workspace Topology`
 * - `Finding 0001 - Astro … Compatibility` -> `Astro … Compatibility`
 * - `Appearance Configuration RFC` -> `Appearance Configuration`
 * - anything else passes through byte-identical.
 *
 * Reading order (groups in manifest order, entries by `sidebar_order` then
 * label) is computed once by `flattenNavEntries`, so the sidebar and the
 * pager cannot disagree about what "next" means.
 */

import {
  NAV_GROUPS,
  groupForRoute,
  navGroupLabel,
  routeSegments,
  type NavGroupId,
} from "./docsNavGroups.ts";

export type SidebarEntry = {
  readonly slug: string;
  readonly title: string;
  readonly order: number;
};

/** One rendered top-level group: its label and its (flat) page entries. */
export type DocsNavGroup = {
  readonly id: NavGroupId;
  readonly label: string;
  readonly entries: readonly SidebarEntry[];
  /** `true` when the rendered page is one of this group's entries. */
  readonly isCurrent: boolean;
};

/** Breadcrumb step. `href === null` renders as plain text (no dead links). */
export type BreadcrumbItem = {
  readonly label: string;
  readonly href: string | null;
};

/** Previous/next pager targets in sidebar reading order. */
export type NavPager = {
  readonly previous: SidebarEntry | null;
  readonly next: SidebarEntry | null;
};

/** First breadcrumb step: the version's documentation index. */
export const DOCS_ROOT_LABEL = "Docs";

/** Strip a leading machine code (`ADR 0003 - `, `FINDING 0001 - `) at render time. */
function stripLeadingCodePrefix(title: string): string | null {
  const match =
    /^(?:ADR|RFC|FIND(?:ING)?|OQ|LD|RM|RS|MV)\s+0*(\d+)\s*[-–—:]\s*(.+)$/i.exec(
      title.trim(),
    );
  if (match === null || match[2] === undefined || match[2].length === 0) {
    return null;
  }
  return match[2];
}

/** Strip a trailing ` RFC` suffix (render-time only). */
function stripTrailingRfcSuffix(title: string): string | null {
  const match = /^(.*\S)\s+RFC$/i.exec(title.trim());
  if (match === null || match[1] === undefined) {
    return null;
  }
  return match[1];
}

export function displayTitle(title: string): string {
  const stripped = stripLeadingCodePrefix(title) ?? title;
  return stripTrailingRfcSuffix(stripped) ?? stripped;
}

/** Human label for one path segment (`user-guide` -> `User guide`). */
export function segmentLabel(segment: string): string {
  const spaced = segment.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Human label for a canonical route: the display form of the page title when
 * there is a page there, else the last segment's label.
 *
 * This is the single rule behind the "a route that is both a folder and a
 * page" case (website#96): such a route is an entry like any other and shows
 * its own page title — never a generic affordance.
 */
export function routeLabel(slug: string, title: string | undefined): string {
  if (title !== undefined && title.length > 0) {
    return displayTitle(title);
  }
  const segments = routeSegments(slug);
  return segmentLabel(segments[segments.length - 1] ?? "");
}

export function hrefFor(version: string, slug: string): string {
  return slug === "" ? `/docs/${version}/` : `/docs/${version}/${slug}/`;
}

function compareEntries(left: SidebarEntry, right: SidebarEntry): number {
  return (
    left.order - right.order ||
    displayTitle(left.title).localeCompare(displayTitle(right.title)) ||
    left.slug.localeCompare(right.slug)
  );
}

/**
 * Group entries into the reader-intent navigation model. Empty groups are
 * dropped, so the top level carries only groups the pinned corpus fills.
 * Entry order within a group is `sidebar_order`, then label, then slug, so
 * the result is deterministic for identical inputs.
 */
export function buildNavGroups(
  entries: readonly SidebarEntry[],
  currentSlug = "",
): DocsNavGroup[] {
  const buckets = new Map<NavGroupId, SidebarEntry[]>();
  for (const entry of entries) {
    const id = groupForRoute(entry.slug);
    const bucket = buckets.get(id);
    if (bucket === undefined) {
      buckets.set(id, [entry]);
    } else {
      bucket.push(entry);
    }
  }
  return NAV_GROUPS.filter(
    (group) => (buckets.get(group.id)?.length ?? 0) > 0,
  ).map((group) => {
    const groupEntries = [...(buckets.get(group.id) ?? [])].sort(
      compareEntries,
    );
    return {
      id: group.id,
      label: group.label,
      entries: groupEntries,
      isCurrent: groupEntries.some((entry) => entry.slug === currentSlug),
    };
  });
}

/** Every entry in sidebar reading order (groups in manifest order). */
export function flattenNavEntries(
  groups: readonly DocsNavGroup[],
): readonly SidebarEntry[] {
  return groups.flatMap((group) => group.entries);
}

/**
 * Previous/next targets for the rendered page, derived from the sidebar
 * reading order. A page that is not in the navigation model (for example an
 * unpublished entry) gets no pager instead of a guessed neighbour.
 */
export function pagerFor(
  groups: readonly DocsNavGroup[],
  currentSlug: string,
): NavPager {
  const flat = flattenNavEntries(groups);
  const index = flat.findIndex((entry) => entry.slug === currentSlug);
  if (index === -1) {
    return { previous: null, next: null };
  }
  return {
    previous: flat[index - 1] ?? null,
    next: flat[index + 1] ?? null,
  };
}

/**
 * Breadcrumb trail for a canonical docs slug, derived from the route (never
 * from corpus frontmatter): the docs index, the reader-intent group, then
 * every route prefix up to the current page. Every step links only when a
 * published page exists at that route — including the docs index, which is a
 * published page rather than a constant — so a trail can never point at a 404;
 * the current step is always plain text, and labels use the same render-time
 * display rule as the sidebar.
 */
export function buildBreadcrumbs(options: {
  readonly version: string;
  readonly slug: string;
  readonly titles: ReadonlyMap<string, string>;
}): readonly BreadcrumbItem[] {
  const { version, slug, titles } = options;
  const items: BreadcrumbItem[] = [
    {
      label: DOCS_ROOT_LABEL,
      href: slug === "" || !titles.has("") ? null : hrefFor(version, ""),
    },
    { label: navGroupLabel(groupForRoute(slug)), href: null },
  ];
  const segments = routeSegments(slug);
  for (let index = 0; index < segments.length; index += 1) {
    const prefix = segments.slice(0, index + 1).join("/");
    const title = titles.get(prefix);
    const isCurrent = index === segments.length - 1;
    items.push({
      label: routeLabel(prefix, title),
      href: isCurrent || title === undefined ? null : hrefFor(version, prefix),
    });
  }
  return items;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHref(href: string): string {
  return href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Render the two-layer sidebar: one `<ul>` of groups, each with a
 * `<details>`/`<summary>` disclosure and exactly one `<ul>` of page links.
 * The current page carries the page's only `aria-current="page"`; the
 * current group renders open so the reader's section is visible on load.
 */
export function renderSidebarTree(
  groups: readonly DocsNavGroup[],
  version: string,
  currentSlug: string,
): string {
  const groupHtml = groups
    .map((group) => {
      const open = group.isCurrent ? " open" : "";
      const items = group.entries
        .map((entry) => {
          const current =
            entry.slug === currentSlug ? ' aria-current="page"' : "";
          return `<li class="docs-nav-entry"><a href="${escapeHref(hrefFor(version, entry.slug))}"${current}>${escapeHtml(routeLabel(entry.slug, entry.title))}</a></li>`;
        })
        .join("");
      return `<li class="docs-nav-group"><details class="docs-nav-group-details"${open}><summary>${escapeHtml(group.label)}</summary><ul>${items}</ul></details></li>`;
    })
    .join("");
  return `<ul class="docs-nav-tree">${groupHtml}</ul>`;
}
