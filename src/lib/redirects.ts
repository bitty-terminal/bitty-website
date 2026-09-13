/**
 * Redirect manifest — split ownership (RD-1..RD-6).
 *
 * - Intent file: bitty-docs `docs/project/redirects.json`, consumed from the
 *   pinned mirror at `src/content/docs/docs/project/redirects.json` when the
 *   revision ships it (RD-2).
 * - Implementation file: `src/redirects.json` (website-only, may be empty).
 *
 * Build output (RD-3/RD-6), emitted by the Astro integration in
 * `astro.config.mjs` and by the legacy redirect pages in
 * `src/pages/docs/[version]/[...slug].astro`:
 * - Astro and static legacy redirect pages for the old document routes;
 * - `dist/_redirects` exact + wildcard rules for Cloudflare Workers Static
 *   Assets (301 semantics at the edge);
 * - `dist/redirects.json` with the expanded per-version table.
 *
 * Validation fails closed on loops, chains, duplicate `old`, missing targets,
 * wildcards in the manifest, or conflicting targets between sources.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import websiteRedirects from "../redirects.json" with { type: "json" };

export type RedirectEntry = {
  readonly old: string;
  readonly new: string;
  readonly status: 301 | 302;
  readonly reason: string;
  readonly effective_version: string;
};

export type ExpandedRedirectRule = {
  readonly from: string;
  readonly to: string;
  readonly status: 301 | 302;
  readonly reason: string;
  readonly effective_version: string;
  readonly version: string;
};

/** Website-only navigation redirects that are not part of the docs manifest. */
export const BASE_REDIRECTS: Readonly<Record<string, string>> = {
  "/docs": "/docs/latest/",
};

const DOCS_INTENT_RELATIVE = "src/content/docs/docs/project/redirects.json";
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function isExactPathPrefix(value: string): boolean {
  // Must be absolute, start with /docs/, end with /, no wildcards/globs/regex.
  if (!value.startsWith("/docs/") || !value.endsWith("/")) return false;
  if (/[*?[\]{}()^$|\\]/.test(value)) return false;
  if (value.includes("*") || value.includes("?")) return false;
  return true;
}

function validateEntries(
  value: unknown,
  origin: string,
): readonly RedirectEntry[] {
  if (!Array.isArray(value)) {
    throw new Error(`${origin} must be an array`);
  }
  const entries: RedirectEntry[] = [];
  for (const raw of value as Array<Record<string, unknown>>) {
    if (
      typeof raw.old !== "string" ||
      typeof raw.new !== "string" ||
      typeof raw.reason !== "string" ||
      typeof raw.effective_version !== "string"
    ) {
      throw new Error(
        `${origin}: invalid redirect entry ${JSON.stringify(raw)}`,
      );
    }
    if (raw.status !== 301 && raw.status !== 302) {
      throw new Error(
        `${origin}: redirect status must be 301 or 302: ${JSON.stringify(raw)}`,
      );
    }
    if (!isExactPathPrefix(raw.old) || !isExactPathPrefix(raw.new)) {
      throw new Error(
        `${origin}: redirect old/new must be exact /docs/ prefixes ending with /: ${JSON.stringify(raw)}`,
      );
    }
    if (!SEMVER.test(raw.effective_version)) {
      throw new Error(
        `${origin}: effective_version must be a concrete semver: ${JSON.stringify(raw)}`,
      );
    }
    entries.push({
      old: raw.old,
      new: raw.new,
      status: raw.status,
      reason: raw.reason,
      effective_version: raw.effective_version,
    });
  }
  return entries;
}

export function loadWebsiteRedirects(): readonly RedirectEntry[] {
  return validateEntries(websiteRedirects, "src/redirects.json");
}

/**
 * RD-2 intent manifest consumed from the pinned mirror. Returns an empty list
 * when the pinned bitty-docs revision does not ship the file yet.
 */
export async function loadDocsIntentRedirects(
  cwd: string = process.cwd(),
): Promise<readonly RedirectEntry[]> {
  const file = resolve(cwd, DOCS_INTENT_RELATIVE);
  if (!existsSync(file)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(
      `${DOCS_INTENT_RELATIVE} is not valid JSON: ${(error as Error).message}`,
    );
  }
  return validateEntries(parsed, DOCS_INTENT_RELATIVE);
}

/**
 * RD-3 merge: identical `old` entries deduplicate, conflicting targets or
 * statuses fail closed. The result is sorted by `old` for deterministic
 * manifests and artifacts.
 */
export function mergeRedirectEntries(
  ...sources: ReadonlyArray<readonly RedirectEntry[]>
): readonly RedirectEntry[] {
  const byOld = new Map<string, RedirectEntry>();
  for (const source of sources) {
    for (const entry of source) {
      const existing = byOld.get(entry.old);
      if (
        existing !== undefined &&
        (existing.new !== entry.new || existing.status !== entry.status)
      ) {
        throw new Error(
          `Conflicting redirect targets for ${entry.old}: ${existing.new} (${existing.status}) vs ${entry.new} (${entry.status})`,
        );
      }
      byOld.set(entry.old, entry);
    }
  }
  return [...byOld.values()].sort((a, b) => a.old.localeCompare(b.old));
}

/** Website implementation entries merged with the docs-owned intent entries. */
export async function loadMergedRedirects(
  cwd: string = process.cwd(),
): Promise<readonly RedirectEntry[]> {
  return mergeRedirectEntries(
    loadWebsiteRedirects(),
    await loadDocsIntentRedirects(cwd),
  );
}

function parseSemver(
  value: string,
): readonly [number, number, number, string] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ?? ""];
}

function compareSemver(
  a: readonly [number, number, number, string],
  b: readonly [number, number, number, string],
): number {
  for (const index of [0, 1, 2] as const) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  if (a[3] === b[3]) return 0;
  if (a[3] === "") return 1;
  if (b[3] === "") return -1;
  return a[3] < b[3] ? -1 : 1;
}

/**
 * RD-4: an entry only produces a redirect for a hosted version at or after its
 * `effective_version`. Aliases are resolved by the caller; when a segment
 * cannot be resolved to a concrete version it is kept rather than silently
 * dropped.
 */
function versionAtLeast(candidate: string, minimum: string): boolean {
  const parsedCandidate = parseSemver(candidate);
  const parsedMinimum = parseSemver(minimum);
  if (parsedCandidate === null || parsedMinimum === null) return true;
  return compareSemver(parsedCandidate, parsedMinimum) >= 0;
}

/**
 * Expand the version-less manifest prefixes per hosted version segment
 * (MV-...): `/docs/<old>/` becomes `/docs/<version>/<old>/`.
 */
export function buildExpandedRedirectTable(
  entries: readonly RedirectEntry[],
  hostedVersions: readonly string[],
  resolveVersion: (segment: string) => string = (segment) => segment,
): readonly ExpandedRedirectRule[] {
  const byFrom = new Map<string, ExpandedRedirectRule>();
  for (const entry of entries) {
    for (const version of hostedVersions) {
      if (!versionAtLeast(resolveVersion(version), entry.effective_version)) {
        continue;
      }
      const from = `/docs/${version}${entry.old.slice("/docs".length)}`;
      const to = `/docs/${version}${entry.new.slice("/docs".length)}`;
      if (!isExactPathPrefix(from) || !isExactPathPrefix(to)) {
        throw new Error(
          `Expanded redirect is not an exact prefix: ${from} -> ${to}`,
        );
      }
      const existing = byFrom.get(from);
      if (existing !== undefined && existing.to !== to) {
        throw new Error(
          `Conflicting redirect targets for ${from}: ${existing.to} vs ${to}`,
        );
      }
      byFrom.set(from, {
        from,
        to,
        status: entry.status,
        reason: entry.reason,
        effective_version: entry.effective_version,
        version,
      });
    }
  }
  const table = [...byFrom.values()].sort((a, b) =>
    a.from.localeCompare(b.from),
  );
  validateExpandedRedirects(new Map(table.map((rule) => [rule.from, rule.to])));
  return table;
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
  return new Map(
    buildExpandedRedirectTable(entries, hostedVersions).map((rule) => [
      rule.from,
      rule.to,
    ]),
  );
}

/**
 * Map each eligible canonical route slug to the legacy route slug it moved
 * from, using the manifest prefixes. Slugs are route paths without the leading
 * `/docs/` or trailing `/` (for example `projects/bitty/specifications/readme`).
 *
 * The alias is derived from the actual published route identity, so no second
 * route mapper is introduced (RM-6). A legacy alias that would shadow a
 * canonical route, two aliases that collide, or a `new` prefix with no
 * currently published route (RD-4) fails closed.
 */
export function buildLegacyAliases(
  canonicalSlugs: readonly string[],
  entries: readonly RedirectEntry[],
): Map<string, string> {
  const canonical = new Set(canonicalSlugs);
  const aliases = new Map<string, string>();
  for (const entry of entries) {
    const oldBase = entry.old.slice("/docs/".length).replace(/\/$/, "");
    const newBase = entry.new.slice("/docs/".length).replace(/\/$/, "");
    if (newBase.length === 0) continue;
    let matched = false;
    for (const slug of canonicalSlugs) {
      let alias: string | null = null;
      if (slug === newBase) {
        alias = oldBase;
      } else if (slug.startsWith(`${newBase}/`)) {
        alias = `${oldBase}/${slug.slice(newBase.length + 1)}`;
      }
      if (alias === null) continue;
      matched = true;
      if (canonical.has(alias)) {
        throw new Error(
          `Legacy alias "${alias}" (for "${slug}") collides with a canonical route`,
        );
      }
      const existing = aliases.get(alias);
      if (existing !== undefined && existing !== slug) {
        throw new Error(
          `Legacy alias "${alias}" maps to both "${existing}" and "${slug}"`,
        );
      }
      aliases.set(alias, slug);
    }
    if (!matched) {
      throw new Error(
        `Redirect target "${entry.new}" has no currently published route (RD-4)`,
      );
    }
  }
  return aliases;
}

/** Cloudflare Workers Static Assets `_redirects` content (RD-3). */
export function renderEdgeRedirects(
  table: readonly ExpandedRedirectRule[],
  baseRedirects: Readonly<Record<string, string>> = BASE_REDIRECTS,
): string {
  const lines = [
    "# Generated by bitty-website (Website Delivery RFC RD-3/RD-6). Do not edit by hand.",
    "# Exact rules first, then wildcard rules; Cloudflare applies the first match.",
  ];
  for (const [from, to] of Object.entries(baseRedirects)) {
    lines.push(`${from} ${to} 301`);
  }
  for (const rule of table) {
    lines.push(`${rule.from} ${rule.to} ${rule.status}`);
  }
  for (const rule of table) {
    lines.push(`${rule.from}* ${rule.to}:splat ${rule.status}`);
  }
  return `${lines.join("\n")}\n`;
}

/** `dist/redirects.json` per-deployment evidence (RD-6). */
export function renderRedirectEvidence(
  table: readonly ExpandedRedirectRule[],
  meta: {
    readonly docsRevision: string;
    readonly hostedVersions: readonly string[];
  },
): string {
  const payload = {
    source: "bitty-website",
    docs_revision: meta.docsRevision,
    hosted_versions: [...meta.hostedVersions],
    redirects: table.map((rule) => ({
      from: rule.from,
      to: rule.to,
      status: rule.status,
      reason: rule.reason,
      effective_version: rule.effective_version,
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
