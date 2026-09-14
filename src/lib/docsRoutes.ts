/**
 * Authoritative route mapping per Website Delivery RFC RM-1 / RM-2 / RM-6 (OQ-023).
 *
 * This module is the single collision and identity authority (RM-6): it is
 * imported by the Astro renderer (`src/pages/docs/[version]/[...slug].astro`)
 * and by the sync/check scripts (`scripts/sync-docs.mjs`,
 * `scripts/check-docs-sync.mjs`), so all three agree by construction.
 *
 * Source: `docs/<category>/<path>.md`
 * Route:  `/docs/<version>/<category>/<slug>/`
 *
 * The mapping reproduces exactly what the Astro glob loader emits for the
 * same file: every path segment is slugged with `github-slugger` (the same
 * function the renderer uses), a trailing `index` segment is dropped, and
 * `docs/README.md` is the revision index:
 *
 * - `docs/README.md` -> `/docs/<version>/`
 * - `docs/<category>/index.md` -> `/docs/<version>/<category>/`
 * - `docs/<category>/README.md` -> `/docs/<version>/<category>/readme/`
 *   (explicit `readme` slug, as rendered)
 * - `docs/<category>/<dir>/README.md` -> `/docs/<version>/<category>/<dir>/readme/`
 * - `docs/<category>/<dir>/index.md` -> `/docs/<version>/<category>/<dir>/`
 * - `docs/projects/<project>/...` keeps the project segment in the route
 *   hierarchy, as accepted by the project partition migration
 *   (bitty-docs CTX-0185).
 *
 * Only `.md` files are routable. Source-relative path is the authoritative
 * content identity (RM-3). Two distinct eligible sources mapping to the same
 * public route (compared case-insensitively) fail closed via
 * validateRouteCollisions() (RM-4); the fix belongs in the owning
 * documentation repository, never in this mapper.
 */

import { slug as githubSlug } from "github-slugger";

export type VersionedDocsRoute = {
  readonly sourcePath: string; // repo-relative, e.g. docs/specifications/foo/bar.md
  readonly category: string; // e.g. specifications
  readonly slugPath: string; // e.g. foo/bar (empty for the revision index)
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
  "projects",
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
  const slug = githubSlug(segment);
  if (slug.length === 0) {
    throw new Error(`Cannot slugify segment "${segment}": collapses to empty`);
  }
  return slug;
}

function assertCategory(category: string, sourcePath: string): void {
  const isLegacy = LEGACY_CATEGORIES.has(category);
  if (
    (!ALLOWED_CATEGORIES.has(category) && !isLegacy) ||
    !CATEGORY_PATTERN.test(category)
  ) {
    throw new Error(
      `Unknown or invalid category "${category}" in ${sourcePath}`,
    );
  }
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

  // docs/README.md (any case that slugs to `readme`) is the revision index.
  if (parts.length === 1 && githubSlug(parts[0] as string) === "readme") {
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

  const category = parts[0] as string;
  assertCategory(category, sourcePath);

  const remainder = parts.slice(1);
  if (remainder.length === 0) {
    throw new Error(
      `File without path inside category is not routable: ${sourcePath}`,
    );
  }

  // Slug every segment exactly like the Astro glob loader, then drop a
  // trailing `index` segment at any depth (nested index handling).
  const slugged = remainder.map(slugifySegment);
  const last = slugged[slugged.length - 1] as string;
  const withoutIndex = last === "index" ? slugged.slice(0, -1) : slugged;
  const slugPath = withoutIndex.join("/");

  const routeWithoutVersion =
    slugPath.length === 0
      ? `/docs/${category}/`
      : `/docs/${category}/${slugPath}/`;
  return {
    sourcePath,
    category,
    slugPath,
    routeWithoutVersion,
    versionedRoute: (version: string): string =>
      slugPath.length === 0
        ? `/docs/${normalizeVersionSegment(version)}/${category}/`
        : `/docs/${normalizeVersionSegment(version)}/${category}/${slugPath}/`,
  };
}

/**
 * Map a source-relative docs DIRECTORY to its version-less route directory.
 *
 * Used for non-Markdown asset emission and asset-reference rewriting (MV-4):
 * the asset `docs/<category>/<dir>/<file>` is published at
 * `/docs/<version>/<category>/<dir>/<file>` with every directory segment
 * slugged exactly like document routes. No `index` stripping applies to
 * directories (only document filenames collapse).
 *
 * @throws on paths outside `docs/` or with an invalid category
 */
export function sourceDirToRouteDir(sourceDir: string): string {
  if (sourceDir === "docs" || sourceDir === "docs/") {
    return "/docs/";
  }
  if (!sourceDir.startsWith("docs/")) {
    throw new Error(`Source dir must start with docs/: ${sourceDir}`);
  }
  const trimmed =
    sourceDir.endsWith("/") && sourceDir.length > "docs/".length
      ? sourceDir.slice(0, -1)
      : sourceDir;
  const parts = trimmed.slice("docs/".length).split("/");
  const category = parts[0];
  if (category === undefined || category.length === 0) {
    throw new Error(`Invalid source dir: ${sourceDir}`);
  }
  assertCategory(category, sourceDir);
  const slugged = parts.map(slugifySegment);
  return `/docs/${slugged.join("/")}/`;
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
 * revision; callers should scope by revision. Comparison is
 * case-insensitive because the renderer lowercases every segment.
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
    byRoute.set(normalized, sp);
  }
}
