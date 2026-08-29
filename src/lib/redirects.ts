/**
 * Redirect manifest — split ownership (RD-1..RD-6).
 *
 * - Intent file: bitty-docs docs/project/redirects.json (consumed at sync time,
 *   placed at src/content/docs/docs/project/redirects.json when present).
 * - Implementation file: src/redirects.json (website-only, may be empty array).
 *
 * Build merges both into Astro `redirects` and Cloudflare `_redirects`, failing
 * closed on loops, chains, duplicate `old`, missing targets, or wildcards.
 */

import websiteRedirects from "../redirects.json" with { type: "json" };

export type RedirectEntry = {
  readonly old: string;
  readonly new: string;
  readonly status: 301 | 302;
  readonly reason: string;
  readonly effective_version: string;
};

function isExactPathPrefix(value: string): boolean {
  // Must be absolute, start with /docs/, end with /, no wildcards/globs/regex.
  if (!value.startsWith("/docs/") || !value.endsWith("/")) return false;
  if (/[*?[\]{}()^$|\\]/.test(value)) return false;
  if (value.includes("*") || value.includes("?")) return false;
  return true;
}

export function loadWebsiteRedirects(): readonly RedirectEntry[] {
  const arr = websiteRedirects as unknown;
  if (!Array.isArray(arr)) {
    throw new Error("src/redirects.json must be an array");
  }
  for (const e of arr as Array<Record<string, unknown>>) {
    if (
      typeof e.old !== "string" ||
      typeof e.new !== "string" ||
      typeof e.reason !== "string" ||
      typeof e.effective_version !== "string"
    ) {
      throw new Error(`Invalid redirect entry ${JSON.stringify(e)}`);
    }
    if (e.status !== 301 && e.status !== 302) {
      throw new Error(
        `Redirect status must be 301 or 302: ${JSON.stringify(e)}`,
      );
    }
    if (!isExactPathPrefix(e.old) || !isExactPathPrefix(e.new)) {
      throw new Error(
        `Redirect old/new must be exact /docs/ prefixes ending with /: ${JSON.stringify(e)}`,
      );
    }
  }
  return arr as readonly RedirectEntry[];
}

/**
 * Validate redirect table expanded per hosted version:
 * - no duplicate old
 * - no loop (old -> ... -> old)
 * - chains longer than 1 hop
 * - old/new must be under /docs/<version>/ (caller expands)
 */
export function validateExpandedRedirects(
  expanded: ReadonlyMap<string, string>,
): void {
  for (const [old, target] of expanded) {
    if (!old.startsWith("/docs/") || !target.startsWith("/docs/")) {
      throw new Error(
        `Expanded redirect must live under /docs/<version>/: ${old} -> ${target}`,
      );
    }
    // Loop
    if (old === target) {
      throw new Error(`Redirect loop: ${old} -> ${target}`);
    }
    // Chain: if target itself is an old, that's a chain longer than 1 hop
    if (expanded.has(target)) {
      throw new Error(
        `Redirect chain longer than 1 hop: ${old} -> ${target} -> ${expanded.get(target)}`,
      );
    }
  }
}

export function expandRedirectsForVersions(
  entries: readonly RedirectEntry[],
  hostedVersions: readonly string[],
): Map<string, string> {
  const expanded = new Map<string, string>();
  for (const entry of entries) {
    // RD-2: old/new are version-less prefixes; website expands per hosted version
    // e.g. /docs/specifications/foo/ becomes /docs/0.1.0/specifications/foo/
    for (const version of hostedVersions) {
      const verOld = `/docs/${version}${entry.old.slice("/docs".length)}`;
      const verNew = `/docs/${version}${entry.new.slice("/docs".length)}`;
      if (expanded.has(verOld) && expanded.get(verOld) !== verNew) {
        throw new Error(
          `Conflicting redirect targets for ${verOld}: ${expanded.get(verOld)} vs ${verNew}`,
        );
      }
      expanded.set(verOld, verNew);
    }
  }
  validateExpandedRedirects(expanded);
  return expanded;
}
