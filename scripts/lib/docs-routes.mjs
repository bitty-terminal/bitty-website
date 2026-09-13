#!/usr/bin/env bun
/**
 * Deterministic route-collision check for publishable docs.
 *
 * This mirrors the route identity the Astro glob loader actually emits for the
 * pinned corpus. It intentionally duplicates the mapping in
 * `src/lib/docsRoutes.ts` because that module and the renderer disagree on
 * nested `README`/`index` handling; reconciling them (RM-6) is tracked as a
 * follow-up. Until then this module is the collision authority used by sync
 * and by the staleness gate.
 */

const ALLOWED_CATEGORIES = new Set([
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

// Legacy filesystem directories present in the pinned corpus.
const LEGACY_CATEGORIES = new Set(["interfaces"]);

function slugifySegment(segment) {
  const slug = segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    throw new Error(`Cannot slugify segment "${segment}": collapses to empty`);
  }
  return slug;
}

/** Map a source-relative path to the version-less route the renderer emits. */
export function sourceToRoute(sourcePath) {
  if (sourcePath === "docs/README.md") return "/docs/";
  if (!sourcePath.startsWith("docs/") || !sourcePath.endsWith(".md")) {
    throw new Error(`Only docs/**/*.md paths are routable: ${sourcePath}`);
  }
  const parts = sourcePath.slice("docs/".length, -3).split("/");
  const category = parts[0];
  if (
    (!ALLOWED_CATEGORIES.has(category) && !LEGACY_CATEGORIES.has(category)) ||
    !/^[a-z][a-z0-9-]*$/.test(category)
  ) {
    throw new Error(
      `Unknown or invalid category "${category}" in ${sourcePath}`,
    );
  }
  const rest = parts.slice(1);
  if (rest.length === 0) {
    throw new Error(`File without a name under a category: ${sourcePath}`);
  }
  if (rest.length === 1 && rest[0] === "README") {
    return `/docs/${category}/`;
  }
  const dirs = rest.slice(0, -1).map(slugifySegment);
  const stem = slugifySegment(rest[rest.length - 1]);
  return `/docs/${category}/${[...dirs, stem].join("/")}/`;
}

/**
 * Reject two distinct publishable sources that map to the same public route.
 *
 * @throws if any two sourcePaths collide (case-insensitively)
 */
export function validateRouteCollisions(sourcePaths) {
  const byRoute = new Map();
  for (const sourcePath of sourcePaths) {
    const route = sourceToRoute(sourcePath);
    const normalized = route.toLowerCase();
    const existing = byRoute.get(normalized);
    if (existing !== undefined && existing !== sourcePath) {
      throw new Error(
        `route collision (RM-4): "${existing}" and "${sourcePath}" both map to "${route}"`,
      );
    }
    byRoute.set(route, sourcePath);
    byRoute.set(normalized, sourcePath);
  }
}
