/**
 * Sidebar tree model (W3 / website#86): nested collapsible tree plus
 * human-readable display titles, computed at render time only.
 *
 * Canonical data (frontmatter titles, slugs, links, pages) is never
 * mutated here — `displayTitle()` returns a derived string and the tree
 * carries both `slug` (canonical, used for links and `aria-current`) and
 * `title` (canonical) plus the derived `label` for rendering.
 *
 * Title rules (render-time only):
 * - `ADR 0003 - Core Workspace Topology` -> `Core Workspace Topology`
 * - `Finding 0001 - Astro … Compatibility` -> `Astro … Compatibility`
 * - `Appearance Configuration RFC` -> `Appearance Configuration`
 * - anything else passes through byte-identical.
 */

export type SidebarEntry = {
  readonly slug: string;
  readonly title: string;
  readonly order: number;
};

export type SidebarNode = {
  /** Route path segments below `/docs/<version>/`, e.g. `["decisions","adrs"]`. */
  readonly segments: readonly string[];
  /** Canonical slug of the page at exactly this path, or `null` for a pure folder. */
  readonly page: SidebarEntry | null;
  /** Child folders, sorted by label. */
  readonly children: readonly SidebarNode[];
  /** Flattened order key: smallest page order in the subtree. */
  readonly order: number;
  /** `true` when the current page is this node or a descendant. */
  readonly isCurrent: boolean;
  /** `true` when this node is exactly the current page. */
  readonly isSelf: boolean;
};

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

type MutableNode = {
  segments: string[];
  page: SidebarEntry | null;
  children: Map<string, MutableNode>;
};

function segmentLabel(segment: string): string {
  const spaced = segment.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Build a nested tree from flat route slugs. The revision index (`""`)
 * is excluded by the caller convention — entries with an empty slug are
 * ignored. A page whose slug is a strict prefix of other pages (e.g.
 * `decisions` index vs `decisions/adrs/...`) becomes the labelled landing
 * page of its folder node.
 */
export function buildSidebarTree(
  entries: readonly SidebarEntry[],
): SidebarNode[] {
  const roots = new Map<string, MutableNode>();

  function childOf(
    parent: Map<string, MutableNode>,
    segment: string,
  ): MutableNode {
    let node = parent.get(segment);
    if (node === undefined) {
      node = { segments: [], page: null, children: new Map() };
      parent.set(segment, node);
    }
    return node;
  }

  for (const entry of entries) {
    if (entry.slug === "") {
      continue;
    }
    const segments = entry.slug.split("/");
    let level = roots;
    let node: MutableNode | undefined;
    for (const segment of segments) {
      node = childOf(level, segment);
      level = node.children;
    }
    // Last-writer collision: keep the lowest explicit order.
    if (node !== undefined) {
      if (node.page === null || entry.order < node.page.order) {
        node.page = entry;
      }
    }
  }

  function finalize(
    segment: string,
    node: MutableNode,
    trail: readonly string[],
  ): SidebarNode {
    const segments = [...trail, segment];
    const kids = [...node.children.entries()]
      .map(([key, kid]) => finalize(key, kid, segments))
      .sort(
        (left, right) =>
          left.order - right.order ||
          nodeLabel(left).localeCompare(nodeLabel(right)),
      );
    const ownOrder = node.page?.order;
    const kidOrder = kids.length > 0 ? kids[0]?.order : undefined;
    const order =
      ownOrder !== undefined && kidOrder !== undefined
        ? Math.min(ownOrder, kidOrder)
        : (ownOrder ?? kidOrder ?? Number.MAX_SAFE_INTEGER);
    return {
      segments,
      page: node.page,
      children: kids,
      order,
      isCurrent: false,
      isSelf: false,
    };
  }

  return [...roots.entries()]
    .map(([key, node]) => finalize(key, node, []))
    .sort(
      (left, right) =>
        left.order - right.order ||
        nodeLabel(left).localeCompare(nodeLabel(right)),
    );
}

/** Folder label: the landing page's display title when present, else the segment label. */
export function nodeLabel(node: SidebarNode): string {
  if (node.page !== null) {
    return displayTitle(node.page.title);
  }
  return segmentLabel(node.segments[node.segments.length - 1] ?? "");
}

/** Human label for one path segment inside a folder (never a page title). */
export function folderSegmentLabel(segment: string): string {
  return segmentLabel(segment);
}

export function markCurrent(
  nodes: readonly SidebarNode[],
  currentSlug: string,
): SidebarNode[] {
  return nodes.map((node) => {
    const kids = markCurrent(node.children, currentSlug);
    const isSelf = node.page?.slug === currentSlug;
    const isCurrent = isSelf || kids.some((kid) => kid.isCurrent);
    return { ...node, children: kids, isCurrent, isSelf };
  });
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

export function hrefFor(version: string, slug: string): string {
  return slug === "" ? `/docs/${version}/` : `/docs/${version}/${slug}/`;
}

function renderNode(node: SidebarNode, version: string, depth: number): string {
  const kids = node.children
    .map((kid) => renderNode(kid, version, depth + 1))
    .join("");
  const hasPage = node.page !== null;
  const link = hasPage
    ? `<a href="${escapeHref(hrefFor(version, (node.page as SidebarEntry).slug))}"${node.isSelf ? ' aria-current="page"' : ""}>${escapeHtml(displayTitle((node.page as SidebarEntry).title))}</a>`
    : `<span class="docs-nav-folder-label" aria-hidden="false">${escapeHtml(folderSegmentLabel(node.segments[node.segments.length - 1] ?? ""))}</span>`;

  if (node.children.length === 0) {
    return `<li class="docs-nav-leaf">${link}</li>`;
  }
  const open = node.isCurrent ? " open" : "";
  const list = `<ul>${kids}</ul>`;
  // Folder with a landing page: the page link renders first, the subtree
  // collapses under a separate "Contents" disclosure so the link itself
  // stays a plain keyboard-operable anchor.
  if (hasPage) {
    return `<li class="docs-nav-branch">${link}<details class="docs-nav-sub"${open}><summary><span>Contents</span></summary>${list}</details></li>`;
  }
  return `<li class="docs-nav-branch"><details class="docs-nav-sub"${open}><summary>${escapeHtml(folderSegmentLabel(node.segments[node.segments.length - 1] ?? ""))}</summary>${list}</details></li>`;
}

export function renderSidebarTree(
  nodes: readonly SidebarNode[],
  version: string,
): string {
  return `<ul class="docs-nav-tree">${nodes.map((node) => renderNode(node, version, 0)).join("")}</ul>`;
}
