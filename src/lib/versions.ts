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

type ParsedVersionedRoute = {
  readonly rest: string;
  readonly identity: string;
};

function parseVersionedRoute(currentRoute: string): ParsedVersionedRoute {
  // currentRoute is versioned, e.g. /docs/0.1.0/specifications/foo/
  const match = /^\/docs\/[^/]+(\/.*)?$/.exec(currentRoute);
  if (!match) throw new Error(`Not a versioned docs route: ${currentRoute}`);
  const rest = match[1] ?? "/";
  const suffixStart = rest.search(/[?#]/u);
  return {
    rest,
    identity: suffixStart === -1 ? rest : rest.slice(0, suffixStart),
  };
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
  return `/docs/${toVersion}${parseVersionedRoute(currentRoute).rest}`;
}

export function docsIndexRoute(version: string): string {
  return `/docs/${version}/`;
}

/**
 * RS-2: aliases and explicit versions resolve to the same hosted version for
 * active-link marking. Keep this comparison in the versions authority rather
 * than teaching the presentation component how aliases are spelled.
 */
export function isHostedVersion(
  currentVersion: string,
  candidateVersion: string,
): boolean {
  return resolveAlias(currentVersion) === candidateVersion;
}

export function routeIdentityFromVersionedPath(currentRoute: string): string {
  return parseVersionedRoute(currentRoute).identity;
}

/**
 * RS-3: choose the target link only after the caller has proved that the
 * current content identity exists there. A missing or malformed source route
 * fails closed to the target revision index.
 */
export function versionTargetRoute(options: {
  readonly currentRoute: string;
  readonly toVersion: string;
  readonly currentIdentityExists: boolean;
}): string {
  if (!options.currentIdentityExists) {
    return docsIndexRoute(options.toVersion);
  }
  try {
    return rewriteVersionInRoute(options.currentRoute, options.toVersion);
  } catch {
    return docsIndexRoute(options.toVersion);
  }
}

/**
 * RS-3 progressive enhancement: enrich a server-rendered target path with the
 * live query and fragment. The returned path remains valid when both are
 * absent, and existing suffixes are not duplicated if enrichment runs twice.
 * This helper deliberately never rewrites a path or reimplements the routing
 * rule; it only appends URL components read from the live location.
 */
export function appendLocationSuffix(
  targetPath: string,
  search: string,
  hash: string,
): string {
  if (!search && !hash) return targetPath;
  if (/[?#]/.test(targetPath)) return targetPath;

  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  const fragment = hash.startsWith("#") ? hash : hash ? `#${hash}` : "";
  return `${targetPath}${query}${fragment}`;
}

/**
 * RS-2/RS-3 presentation projection: choose the href and active marker for
 * one hosted-version entry. Keeping this pure makes the Astro component a
 * thin renderer and lets tests exercise the exact routing contract without a
 * browser or component harness.
 */
export function versionEntryPresentation(options: {
  readonly currentRoute: string;
  readonly currentVersion: string;
  readonly candidateVersion: string;
  readonly candidateLabel: string;
  readonly candidateIsPrerelease: boolean;
  readonly targetIdentities: ReadonlyMap<string, ReadonlySet<string>>;
}): {
  readonly label: string;
  readonly suffix: string;
  readonly href: string;
  readonly isCurrent: boolean;
} {
  const routeIdentity = (() => {
    try {
      return routeIdentityFromVersionedPath(options.currentRoute);
    } catch {
      return null;
    }
  })();
  const targetIdentity = options.targetIdentities.get(options.candidateVersion);
  return {
    label: options.candidateLabel,
    suffix: options.candidateIsPrerelease ? " (prerelease)" : "",
    href: versionTargetRoute({
      currentRoute: options.currentRoute,
      toVersion: options.candidateVersion,
      currentIdentityExists:
        routeIdentity !== null &&
        targetIdentity !== undefined &&
        targetIdentity.has(routeIdentity),
    }),
    isCurrent: isHostedVersion(
      options.currentVersion,
      options.candidateVersion,
    ),
  };
}
