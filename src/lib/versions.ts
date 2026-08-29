/**
 * Release selector (RS-1..RS-5) and multi-version URL (MV-1..MV-6) helpers.
 *
 * Data comes from the single committed src/content/versions.json (RS-1).
 * Router-accepted version segments are the union of ["latest","stable"] plus
 * every versions[].version (RS-5); unknown segments are 404.
 */

import versionsJson from "../content/versions.json" with { type: "json" };
import { assertVersionsShape } from "./docsValidation.ts";

export type VersionEntry = {
  readonly version: string;
  readonly revision: string;
  readonly label: string;
  readonly prerelease: boolean;
};

export type VersionsFile = {
  readonly latest: string;
  readonly stable: string;
  readonly versions: readonly VersionEntry[];
};

export function getVersions(): VersionsFile {
  assertVersionsShape();
  return versionsJson as VersionsFile;
}

export function isValidVersionSegment(segment: string): boolean {
  const data = getVersions();
  if (segment === "latest" || segment === "stable") return true;
  return (data.versions as readonly VersionEntry[]).some(
    (v) => v.version === segment,
  );
}

export function resolveAlias(segment: string): string {
  const data = getVersions();
  if (segment === "latest") return data.latest;
  if (segment === "stable") return data.stable;
  return segment;
}

/**
 * RS-3 navigation behavior: rewrite only the version segment.
 * Preserves trailing path and query/hash as-is; caller must verify that the
 * target identity exists in the target revision, falling back to /docs/<to>/ otherwise.
 */
export function rewriteVersionInRoute(
  currentRoute: string,
  toVersion: string,
): string {
  // currentRoute is versioned, e.g. /docs/0.1.0/specifications/foo/
  const match = /^\/docs\/([^/]+)(\/.*)?$/.exec(currentRoute);
  if (!match) throw new Error(`Not a versioned docs route: ${currentRoute}`);
  const rest = match[2] ?? "/";
  // Preserve trailing slash canonically
  return `/docs/${toVersion}${rest}`;
}

export function docsIndexRoute(version: string): string {
  return `/docs/${version}/`;
}
