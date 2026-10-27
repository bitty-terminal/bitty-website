/**
 * Release download URL helpers.
 *
 * The `bitty` R2 bucket is served at the CDN origin root, so published
 * release objects live at `/releases/<tag>/<asset>` — never under a
 * `bitty/` prefix. The tag is resolved at build time from
 * `install/latest.txt` (see `scripts/fetch-release.mjs`) and falls back to
 * the committed `release.json`.
 */

import release from "../content/release.json";

export const CDN_ORIGIN = "https://cdn.bitty.run";

export const RELEASE_TAG: string = release.tag;
export const RELEASE_VERSION: string = release.version;

/**
 * Resolve a release asset name to its immutable CDN URL. `{v}` expands to
 * the version without the leading `v` (release assets use `bitty-0.0.29-…`
 * for archives while AppImage/deb/rpm/Exe names are versionless).
 */
export function releaseUrl(asset: string): string {
  if (asset === "" || asset.startsWith("/") || asset.includes("..")) {
    throw new Error(`invalid release asset "${asset}"`);
  }
  return `${CDN_ORIGIN}/releases/${RELEASE_TAG}/${asset.replaceAll("{v}", RELEASE_VERSION)}`;
}

/** Mutable stable pointers published by the release workflow. */
export const CHECKSUMS_URL = releaseUrl("SHA256SUMS");
export const INSTALL_SH_URL = `${CDN_ORIGIN}/install/install.sh`;
export const INSTALL_PS1_URL = `${CDN_ORIGIN}/install/install.ps1`;
