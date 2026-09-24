/**
 * CDN asset URL helpers (CDN-1..CDN-3).
 *
 * Large static assets (screenshots, demo videos, font files) live in the
 * Cloudflare R2 bucket `bitty`, publicly served at {@link CDN_BASE_URL}.
 * The Astro `dist/` output stays text-only; pages reference binary assets
 * through {@link cdnUrl} instead of bundling them.
 *
 * Key scheme (CDN-1): `<prefix>/<name>`, where prefix is one of
 * `images/`, `videos/`, or `fonts/`. Immutable hashed assets
 * (`images/hero-a1b2c3d4.avif`) carry a long-lived edge cache; mutable
 * aliases (`images/hero-latest.avif`) carry a short one (CDN-2).
 */

export const CDN_BASE_URL = "https://cdn.bitty.run";

export const CDN_PREFIXES = ["images/", "videos/", "fonts/"] as const;

export type CdnPrefix = (typeof CDN_PREFIXES)[number];

/** A validated object key relative to the bucket root, e.g. `images/hero.avif`. */
export type CdnKey = `${CdnPrefix}${string}`;

function assertCdnKey(key: string): asserts key is CdnKey {
  if (key === "") {
    throw new Error(`invalid CDN key: key must not be empty`);
  }
  if (key.startsWith("/") || key.includes("..") || key.includes("\\")) {
    throw new Error(
      `invalid CDN key "${key}": must be relative with no traversals`,
    );
  }
  if (!CDN_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new Error(
      `invalid CDN key "${key}": must start with one of ${CDN_PREFIXES.join(", ")}`,
    );
  }
  const rest = key.split("/").slice(1).join("/");
  if (rest === "" || rest.endsWith("/")) {
    throw new Error(
      `invalid CDN key "${key}": must name an object, not a prefix`,
    );
  }
}

/**
 * Resolve a bucket-relative key to its public CDN URL (CDN-3).
 * Throws on keys outside the documented prefix scheme.
 */
export function cdnUrl(key: string): string {
  assertCdnKey(key);
  return `${CDN_BASE_URL}/${key}`;
}

/** True when the URL points at this site's CDN origin. */
export function isCdnUrl(url: string): boolean {
  return url === CDN_BASE_URL || url.startsWith(`${CDN_BASE_URL}/`);
}
