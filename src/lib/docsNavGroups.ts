/**
 * Reader-intent navigation manifest for the docs shell (CTX-0050, website#96).
 *
 * The sidebar's top level is capped at six reader-intent groups. Which group a
 * document belongs to is derived from its canonical route — never from
 * frontmatter, and never from per-component string lists: the first *topic*
 * segment of the route (`groupForRoute`) is looked up here, so grouping has
 * exactly one definition and every route is grouped by construction.
 *
 * The `projects/<project>/...` partition is transparent. The container segment
 * and the project name that follows it say nothing about reader intent, so the
 * first topic segment after them decides the group: a specification under
 * `projects/bitty/specifications/` is Reference exactly like a hypothetical
 * top-level `specifications/` tree, and `projects/bitty/specifications/…` and
 * `decisions/…` can land in different groups without any component knowing.
 *
 * Exhaustiveness against the route manifest is enforced by a unit test
 * (`./docsNavGroups.test.ts`): every category in `ROUTABLE_CATEGORIES` maps to
 * exactly one group, and the manifest declares no category the router rejects.
 * An unknown route fails closed instead of silently disappearing from the
 * sidebar.
 *
 * A topic segment is not necessarily a top-level route category: a corpus may
 * keep `sdk`, `packaging`, or `runtime` as directories beneath its project
 * mount, and those names must group too, or the pages fall back to the
 * container group. That is why {@link NAV_GROUPS} owns every topic segment a
 * consumed corpus can present (checked exhaustively against the mirror by
 * `./docsNavGroups.test.ts`), not only the top-level categories.
 *
 * Category -> group is a presentation decision owned here; moving a topic
 * between groups is a one-line change in `NAV_GROUPS`.
 */

import { ROUTABLE_CATEGORIES } from "./docsRoutes.ts";

export type NavGroupId =
  "overview" | "concepts" | "using" | "extending" | "reference" | "project";

export type NavGroup = {
  readonly id: NavGroupId;
  /** Rendered top-level label. */
  readonly label: string;
  /** Route categories and project topic segments owned by this group. */
  readonly categories: readonly string[];
};

/**
 * The six reader-intent groups, in rendering order. Every entry in
 * `ROUTABLE_CATEGORIES` appears in exactly one group's `categories`, and so
 * does every topic segment a consumed corpus presents below its project mount
 * (the exhaustiveness check in `./docsNavGroups.test.ts` reads the mirror).
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    categories: ["product", "roadmap"],
  },
  {
    id: "concepts",
    label: "Concepts",
    categories: [
      "architecture",
      "decisions",
      // Plugin host runtime topics (`projects/plugins/runtime/...`): how the
      // platform executes plugins is design, not a reference lookup.
      "runtime",
      // AI-core design topics (`projects/bitty-ai/<topic>/...`): agent
      // coordination, context assembly, cross-repository integration,
      // persistence and provider boundaries are architecture-level design,
      // like `architecture/` itself.
      "agent",
      "context",
      "integration",
      "persistence",
      "providers",
    ],
  },
  {
    id: "using",
    label: "Using",
    categories: [
      "configuration",
      "examples",
      "how-to",
      "migrations",
      "troubleshooting",
      "tutorials",
      "user-guide",
    ],
  },
  {
    id: "extending",
    label: "Extending",
    categories: [
      "extensibility",
      "interfaces",
      // Packaging/distribution topics (`projects/plugins/packaging/...`): how a
      // plugin author ships a plugin, grouped with the extension surfaces.
      "packaging",
    ],
  },
  {
    id: "reference",
    label: "Reference",
    categories: [
      "findings",
      "provenance",
      "reference",
      "requirements",
      "security",
      "specifications",
      // Plugin SDK topics (`projects/plugins/sdk/...`): the author-facing API
      // surface, a reference lookup like `reference/`.
      "sdk",
    ],
  },
  {
    id: "project",
    label: "Project",
    categories: ["development", "project", "projects", "releases"],
  },
];

/**
 * Container segment whose child directory names projects instead of topics.
 * A route below it is grouped by the first topic segment found after the
 * project name.
 */
export const PROJECT_CONTAINER_SEGMENT = "projects";

/** The revision index (`/docs/<version>/`) belongs to the entry-point group. */
export const REVISION_INDEX_GROUP: NavGroupId = "overview";

const GROUP_BY_CATEGORY: ReadonlyMap<string, NavGroupId> = new Map(
  NAV_GROUPS.flatMap((group) =>
    group.categories.map((category) => [category, group.id] as const),
  ),
);

/** Route segments below `/docs/<version>/`, e.g. `decisions/adrs/readme`. */
export function routeSegments(slug: string): readonly string[] {
  return slug.split("/").filter((segment) => segment.length > 0);
}

export function navGroup(id: NavGroupId): NavGroup {
  const group = NAV_GROUPS.find((candidate) => candidate.id === id);
  if (group === undefined) {
    throw new Error(`bitty-docs-nav: unknown navigation group "${id}"`);
  }
  return group;
}

export function navGroupLabel(id: NavGroupId): string {
  return navGroup(id).label;
}

/**
 * Resolve the navigation group of a canonical docs slug (`""` is the revision
 * index). Throws when no group owns the route, so a new corpus category can
 * never silently drop out of the sidebar.
 */
export function groupForRoute(slug: string): NavGroupId {
  const segments = routeSegments(slug);
  if (segments.length === 0) {
    return REVISION_INDEX_GROUP;
  }
  // `projects/<project>/<topic>`: the container and the project name are
  // structural, so topic lookup starts after them.
  const topicStart = segments[0] === PROJECT_CONTAINER_SEGMENT ? 2 : 0;
  for (const segment of segments.slice(topicStart)) {
    const group = GROUP_BY_CATEGORY.get(segment);
    if (group !== undefined) {
      return group;
    }
  }
  // No topic segment of its own (the container index or a bare project
  // index): the container's own group owns it.
  const containerGroup = GROUP_BY_CATEGORY.get(segments[0] ?? "");
  if (containerGroup !== undefined) {
    return containerGroup;
  }
  throw new Error(`bitty-docs-nav: no navigation group for route "${slug}"`);
}

/**
 * Namespace for the manifest: the categories the sidebar groups must cover
 * exactly. Read from the route manifest, never restated here.
 */
export function routableCategories(): readonly string[] {
  return [...ROUTABLE_CATEGORIES];
}
