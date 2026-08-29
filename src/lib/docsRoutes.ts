/**
 * Route mapping per Website Delivery RFC RM-1 / RM-2 (OQ-023).
 *
 * Source: `docs/<category>/<path>.md`
 * Route:  `/docs/<version>/<category>/<slug>/`
 *
 * - Category is the single segment after `docs/`.
 * - README.md maps to the category (or revision) index.
 * - Extension must be `.md`; only the final segment is slugified
 *   (lowercased, non-alphanumerics -> `-`).
 * - Mapping is case-sensitive and hierarchy-preserving.
 * - Fail-closed on collisions is enforced by validateRouteCollisions().
 */

export type VersionedDocsRoute = {
  readonly sourcePath: string; // repo-relative, e.g. docs/specifications/foo/bar.md
  readonly category: string; // e.g. specifications
  readonly slugPath: string; // e.g. foo/bar  (empty for category index)
  readonly routeWithoutVersion: string; // e.g. /docs/specifications/foo/bar/
  readonly versionedRoute: (version: string) => string; // e.g. /docs/0.1.0/specifications/foo/bar/
};

const CATEGORY_PATTERN = /^[a-z][a-z0-9-]*$/;
const ALLOWED_CATEGORIES = new Set<string>([
  "architecture",
  "configuration",
  "decisions",
  "development",
  "examples",
  "extensibility",
  "findings",
  "how-to",
  "migrations",
  "product",
  "project",
  "provenance",
  "reference",
  "releases",
  "requirements",
  "roadmap",
  "security",
  "specifications",
  "troubleshooting",
  "tutorials",
  "user-guide",
]);

// Legacy filesystem directories not in the frontmatter category enum but present
// in the pinned corpus (for example `docs/interfaces/`). The router preserves the
// filesystem segment verbatim per RM-1, so they must map rather than fail the build.
const LEGACY_CATEGORIES = new Set<string>(["interfaces"]);

function slugifySegment(segment: string): string {
  const lowered = segment.toLowerCase();
  const slug = lowered.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    throw new Error(`Cannot slugify segment "${segment}": collapses to empty`);
  }
  return slug;
}

/**
 * Map a source-relative docs path to its publishable route identity.
 *
 * @param sourcePath - repo-relative path, must start with `docs/` and end with `.md`
 * @throws on invalid shape, unknown category, or empty slug
 */
export function sourcePathToRouteIdentity(
  sourcePath: string,
): VersionedDocsRoute {
  if (!sourcePath.startsWith("docs/")) {
    throw new Error(`Source path must start with docs/: ${sourcePath}`);
  }
  if (!sourcePath.endsWith(".md")) {
    throw new Error(`Only .md files are routable: ${sourcePath}`);
  }

  const withoutDocsPrefix = sourcePath.slice("docs/".length);
  const withoutExtension = withoutDocsPrefix.slice(0, -".md".length);
  const parts = withoutExtension.split("/");

  if (parts.length === 0 || parts[0] === undefined || parts[0].length === 0) {
    throw new Error(`Invalid source path: ${sourcePath}`);
  }

  const category = parts[0] as string;
  const isLegacy = LEGACY_CATEGORIES.has(category);
  if (
    (!ALLOWED_CATEGORIES.has(category) && !isLegacy) ||
    !CATEGORY_PATTERN.test(category)
  ) {
    throw new Error(
      `Unknown or invalid category "${category}" in ${sourcePath}`,
    );
  }

  const remainder = parts.slice(1);
  const isReadme = remainder.length === 1 && remainder[0] === "README";

  // docs/README.md -> /docs/<version>/
  if (sourcePath === "docs/README.md") {
    const routeWithoutVersion = "/docs/";
    return {
      sourcePath,
      category: "__root__",
      slugPath: "",
      routeWithoutVersion,
      versionedRoute: (version: string) =>
        `/docs/${normalizeVersionSegment(version)}/`,
    };
  }

  if (isReadme) {
    const routeWithoutVersion = `/docs/${category}/`;
    return {
      sourcePath,
      category,
      slugPath: "",
      routeWithoutVersion,
      versionedRoute: (version: string) =>
        `/docs/${normalizeVersionSegment(version)}/${category}/`,
    };
  }

  // Normal file: preserve subdirectory hierarchy, slugify only filename stem.
  if (remainder.length === 0) {
    throw new Error(
      `File without path inside category is not routable: ${sourcePath}`,
    );
  }

  const dirs = remainder.slice(0, -1).map(slugifySegment);
  const maybeFileStem = remainder[remainder.length - 1];
  if (
    maybeFileStem === undefined ||
    maybeFileStem.length === 0 ||
    maybeFileStem === "README"
  ) {
    throw new Error(`Empty or reserved filename in ${sourcePath}`);
  }
  const fileStem: string = maybeFileStem;
  const slug = slugifySegment(fileStem);
  const slugPath = [...dirs, slug].join("/");

  const routeWithoutVersion: string = `/docs/${category}/${slugPath}/`;
  return {
    sourcePath,
    category,
    slugPath,
    routeWithoutVersion,
    versionedRoute: (version: string): string =>
      `/docs/${normalizeVersionSegment(version)}/${category}/${slugPath}/`,
  };
}

function normalizeVersionSegment(version: string): string {
  if (!version) throw new Error("Version segment must not be empty");
  if (
    version.includes("/") ||
    version.includes("\\") ||
    version.includes(" ")
  ) {
    throw new Error(`Invalid version segment "${version}"`);
  }
  return version;
}

/**
 * Fail-closed collision check.
 *
 * Two distinct eligible sources that map to the same public route must fail
 * the build (RM-4). This runs on the set of publishable docs for a single
 * revision; callers should scope by revision.
 *
 * @throws if any two sourcePaths collide at the same routeWithoutVersion
 */
export function validateRouteCollisions(sourcePaths: readonly string[]): void {
  const byRoute = new Map<string, string>();
  for (const sp of sourcePaths) {
    const entry = sourcePathToRouteIdentity(sp);
    const route = entry.routeWithoutVersion;
    const normalized = route.toLowerCase();
    const existing = byRoute.get(normalized);
    if (existing !== undefined && existing !== sp) {
      throw new Error(
        `Route collision: "${existing}" and "${sp}" both map to "${route}" (case-insensitive: "${normalized}")`,
      );
    }
    if (byRoute.has(route) && byRoute.get(route) !== sp) {
      throw new Error(
        `Route collision: duplicate route "${route}" from "${existing}" and "${sp}"`,
      );
    }
    byRoute.set(route, sp);
    byRoute.set(normalized, sp);
  }
}
