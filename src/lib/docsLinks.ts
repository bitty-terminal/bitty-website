/**
 * Version-aware rewriting of relative Markdown links and asset references (MV-4).
 *
 * The pinned mirror renders the same Markdown for every hosted version, so a
 * rewritten reference must be correct under any `/docs/<version>/` prefix
 * without knowing the version. Every rewrite below therefore produces a
 * *relative* URL computed from the source file's own route to the target's
 * route: relative URLs resolve against the page URL, which already carries
 * the version segment.
 *
 * - Relative `.md` links resolve through the authoritative route mapper
 *   (`sourcePathToRouteIdentity`): `../foo/bar.md` from
 *   `docs/<category>/a/one.md` becomes `../bar/` (anchors and queries
 *   preserved verbatim).
 * - Relative non-Markdown references (linked `*.html` diagrams, `*.json`,
 *   `*.yaml`, …) resolve to the per-version asset copy emitted by the
 *   `docsAssets` Astro integration in `astro.config.mjs`
 *   (`sourceDirToRouteDir` layout), again as relative URLs.
 * - `![](...)` image nodes are intentionally NOT rewritten here: Astro's
 *   asset pipeline already bundles relative images (observed as
 *   `/_astro/<name>.<hash>.<ext>` in the build output).
 *
 * Anything that cannot be mapped deterministically — absolute URLs,
 * protocol links, pure fragments, root-relative links (rejected by the LD-5
 * link gate as repository-unportable), targets escaping `docs/`, or targets
 * in an unknown category — is returned as `null` so the caller leaves the
 * reference byte-identical. Fail-closed link existence itself stays with the
 * LD-5 parity gate and `docs:check`, not with this transform.
 */

import {
  sourceDirToRouteDir,
  sourcePathToRouteIdentity,
} from "./docsRoutes.ts";

export type SplitHref = {
  readonly path: string;
  readonly query: string;
  readonly fragment: string;
};

const SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

/** Split `path?query#fragment`, keeping the `?`/`#` delimiters on their parts. */
export function splitHref(href: string): SplitHref {
  const hashIndex = href.indexOf("#");
  const beforeFragment = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : href.slice(hashIndex);
  const queryIndex = beforeFragment.indexOf("?");
  if (queryIndex === -1) {
    return { path: beforeFragment, query: "", fragment };
  }
  return {
    path: beforeFragment.slice(0, queryIndex),
    query: beforeFragment.slice(queryIndex),
    fragment,
  };
}

/**
 * True for references this transform must never touch: absolute URLs,
 * protocol links (`mailto:`, …), protocol-relative (`//host/…`),
 * root-relative (`/docs/…`, rejected by LD-5), and pure fragments (`#…`).
 */
export function isUntouchableHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("/")) return true;
  if (SCHEME_RE.test(trimmed)) return true;
  return false;
}

function posixNormalize(path: string): string {
  const absolute = path.startsWith("/");
  const parts = path.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length > 0) out.pop();
      else if (!absolute) out.push("..");
      continue;
    }
    out.push(part);
  }
  const joined = out.join("/");
  if (absolute) return `/${joined}`;
  return joined.length === 0 ? "." : joined;
}

function posixDirname(path: string): string {
  const index = path.lastIndexOf("/");
  if (index === -1) return ".";
  if (index === 0) return "/";
  return path.slice(0, index);
}

function posixRelative(fromDir: string, to: string): string {
  const fromParts = fromDir.split("/").filter((p) => p.length > 0);
  const toParts = to.split("/").filter((p) => p.length > 0);
  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }
  const up = fromParts.length - common;
  const relParts = [...Array<string>(up).fill(".."), ...toParts.slice(common)];
  return relParts.join("/");
}

/**
 * Resolve a relative reference against a `docs/...` source file.
 *
 * @returns the `docs/...`-relative target path, or `null` when the reference
 * escapes the mirrored `docs/` tree (e.g. `../TODO.md` from `docs/README.md`).
 */
export function resolveDocsTarget(
  sourcePath: string,
  hrefPath: string,
): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(hrefPath);
  } catch {
    return null;
  }
  const sourceDir = posixDirname(sourcePath);
  const joined = sourceDir === "." ? decoded : `${sourceDir}/${decoded}`;
  const normalized = posixNormalize(joined);
  if (normalized === "." || normalized === "docs" || normalized === "docs/") {
    return "docs/README.md";
  }
  if (!normalized.startsWith("docs/")) return null;
  if (normalized.includes("\0")) return null;
  return normalized;
}

export type RewriteOptions = {
  /** Sync `existsSync`-style probe used to resolve directory links. */
  readonly isDirectory?: (docsRelativePath: string) => boolean;
};

/**
 * Rewrite one relative Markdown reference to a version-agnostic relative URL.
 *
 * @param sourcePath - the linking file, `docs/...`-relative (with `.md`)
 * @param href - the raw reference from the Markdown source
 * @returns the rewritten relative URL, or `null` to leave the reference unchanged
 */
export function rewriteDocsHref(
  sourcePath: string,
  href: string,
  options: RewriteOptions = {},
): string | null {
  if (isUntouchableHref(href)) return null;
  const { path, query, fragment } = splitHref(href);
  if (path.length === 0) return null;
  const target = resolveDocsTarget(sourcePath, path);
  if (target === null) return null;

  const mdMatch = /\.md$/i.test(target);
  if (mdMatch) {
    let route: string;
    try {
      route = sourcePathToRouteIdentity(target).routeWithoutVersion;
    } catch {
      return null;
    }
    return joinRoute(route, currentRouteDir(sourcePath), query, fragment, true);
  }

  // Directory link: prefer the directory index the renderer would serve.
  // A trailing slash always signals directory intent. A bare extension-less
  // name consults the probe: a known file is an asset, otherwise directory
  // intent is assumed (the parity gate guarantees existence at the pin).
  const probeSaysFile =
    !target.endsWith("/") &&
    !hasExtension(target) &&
    options.isDirectory !== undefined &&
    !options.isDirectory(target);
  if (!probeSaysFile && (target.endsWith("/") || !hasExtension(target))) {
    const dir = target.endsWith("/") ? target.slice(0, -1) : target;
    for (const indexFile of [`${dir}/README.md`, `${dir}/index.md`]) {
      try {
        const route = sourcePathToRouteIdentity(indexFile).routeWithoutVersion;
        return joinRoute(
          route,
          currentRouteDir(sourcePath),
          query,
          fragment,
          true,
        );
      } catch {
        continue;
      }
    }
    return null;
  }

  // Non-Markdown asset: relative URL to the per-version asset copy.
  let assetDir: string;
  try {
    assetDir = sourceDirToRouteDir(posixDirname(target));
  } catch {
    return null;
  }
  const assetRoutePath = `${assetDir}${target.slice(target.lastIndexOf("/") + 1)}`;
  return joinRoute(
    assetRoutePath,
    currentRouteDir(sourcePath),
    query,
    fragment,
    false,
  );
}

function hasExtension(path: string): boolean {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return base.includes(".");
}

function currentRouteDir(sourcePath: string): string {
  const route = sourcePathToRouteIdentity(sourcePath).routeWithoutVersion;
  return route;
}

/**
 * Express `target` (a version-less `/docs/...` route or asset path) relative
 * to the current page's route directory, preserving trailing-slash page
 * canon (`<page>/`) versus bare asset paths.
 */
function joinRoute(
  target: string,
  fromRouteDir: string,
  query: string,
  fragment: string,
  trailingSlash: boolean,
): string {
  const fromDir = fromRouteDir.endsWith("/")
    ? fromRouteDir.slice(0, -1)
    : fromRouteDir;
  let relative = posixRelative(fromDir, target);
  if (relative.length === 0) {
    return `./${query}${fragment}`;
  }
  if (!relative.startsWith(".") && !relative.startsWith("/")) {
    relative = `./${relative}`;
  }
  if (trailingSlash && !relative.endsWith("/")) {
    relative = `${relative}/`;
  }
  return `${relative}${query}${fragment}`;
}
