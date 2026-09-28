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
  /**
   * Optional exact-rule target: the rendered route the exact rule (and so a
   * reader hitting the subtree root itself) lands on. Absent on a leaf/subtree
   * entry whose `new` already renders.
   *
   * A subtree move needs two different targets (bitty-website#104): `new`
   * stays the descendants prefix — the wildcard base and the pattern the
   * static alias stubs are derived from — while the exact rule must land on a
   * page the mirror renders. For the partition-migration subtrees the bare
   * prefix renders nothing (`README.md` maps to `<dir>/readme/`), so the exact
   * target is that index route (or, where the #97 rule withholds it, the first
   * published child). Semantics: exact rule target = `index_new ?? new`.
   */
  readonly index_new?: string;
  /**
   * `false` when the redirect describes a leaf page with no descendants: the
   * emitter then writes the exact rule only. Defaults to `true` (a subtree
   * move needs the wildcard form). bitty-website#98 §5.
   */
  readonly descendants?: boolean;
};

export type ExpandedRedirectRule = {
  readonly from: string;
  /** Exact-rule target: `index_new ?? new`, versioned. */
  readonly to: string;
  /**
   * Descendants prefix (`new`, versioned): the base of the wildcard rule the
   * emitter writes, when the entry carries descendants. Present only when it
   * differs from `to`, i.e. when the exact rule and the wildcard rule land in
   * different places.
   */
  readonly splat_to?: string;
  readonly status: 301 | 302;
  readonly reason: string;
  readonly effective_version: string;
  readonly version: string;
  readonly descendants?: boolean;
};

/** Website-only navigation redirects that are not part of the docs manifest. */
export const BASE_REDIRECTS: Readonly<Record<string, string>> = {
  "/docs": "/docs/latest/",
};

const DOCS_INTENT_RELATIVE = "src/content/docs/docs/project/redirects.json";
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Strip the `/docs/` mount prefix and any trailing slash, leaving a route slug. */
function toSlug(value: string): string {
  return value.slice("/docs/".length).replace(/\/$/, "");
}

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
    if (raw.descendants !== undefined && typeof raw.descendants !== "boolean") {
      throw new Error(
        `${origin}: redirect descendants must be a boolean when present: ${JSON.stringify(raw)}`,
      );
    }
    if (
      raw.index_new !== undefined &&
      (typeof raw.index_new !== "string" || !isExactPathPrefix(raw.index_new))
    ) {
      throw new Error(
        `${origin}: redirect index_new must be an exact /docs/ prefix ending with /: ${JSON.stringify(raw)}`,
      );
    }
    entries.push({
      old: raw.old,
      new: raw.new,
      status: raw.status,
      reason: raw.reason,
      effective_version: raw.effective_version,
      ...(raw.index_new === undefined ? {} : { index_new: raw.index_new }),
      ...(raw.descendants === undefined
        ? {}
        : { descendants: raw.descendants }),
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
        (existing.new !== entry.new ||
          existing.index_new !== entry.index_new ||
          existing.status !== entry.status ||
          (existing.descendants ?? true) !== (entry.descendants ?? true))
      ) {
        throw new Error(
          `Conflicting redirect targets for ${entry.old}: ${existing.new}${existing.index_new === undefined ? "" : ` (exact ${existing.index_new})`} (${existing.status}, descendants ${existing.descendants ?? true}) vs ${entry.new}${entry.index_new === undefined ? "" : ` (exact ${entry.index_new})`} (${entry.status}, descendants ${entry.descendants ?? true})`,
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

/**
 * Reason recorded on every publication-policy redirect (website#97). Export
 * so the dist gate can recognize the policy's own redirects in
 * `dist/redirects.json` without re-deriving them.
 */
export const PUBLICATION_REDIRECT_REASON =
  "publication policy (bitty-website#97): page is not reader-facing, so it left the site";

/** Version-less `/docs/.../` route pair the publication policy excludes. */
export type PublicationRedirectPlan = {
  readonly from: string;
  readonly to: string;
};

/**
 * Materialize the publication policy's redirect plan as redirect entries, so
 * an excluded page leaves the site as a 301 through the one redirect
 * mechanism (RD-3/RD-6) instead of a 404. `effectiveVersion` is the lowest
 * hosted version: an exclusion applies to every hosted segment, not from some
 * later release onward.
 *
 * @throws when a plan entry is not an exact `/docs/.../` prefix pair or would
 *   redirect a route onto itself
 */
export function buildPublicationRedirectEntries(
  plan: readonly PublicationRedirectPlan[],
  effectiveVersion: string,
): readonly RedirectEntry[] {
  return plan.map((redirect) => {
    if (!isExactPathPrefix(redirect.from) || !isExactPathPrefix(redirect.to)) {
      throw new Error(
        `Publication redirect must be an exact /docs/ prefix pair ending with /: ${redirect.from} -> ${redirect.to}`,
      );
    }
    if (redirect.from === redirect.to) {
      throw new Error(`Publication redirect loop: ${redirect.from}`);
    }
    return {
      old: redirect.from,
      new: redirect.to,
      status: 301 as const,
      reason: PUBLICATION_REDIRECT_REASON,
      effective_version: effectiveVersion,
      // A demoted page is a leaf: the exact rule is the whole rule, so the
      // emitter must not spend one of Cloudflare's 100 dynamic slots on it.
      descendants: false,
    };
  });
}

/**
 * Lowest concrete version of `versions` — the `effective_version` an entry
 * needs when it must apply to every hosted segment (RD-4). Version ordering
 * lives here so callers never compare versions themselves.
 *
 * @throws when no concrete semver version is present
 */
export function lowestVersion(versions: readonly string[]): string {
  let lowest: string | null = null;
  for (const version of versions) {
    const parsed = parseSemver(version);
    if (parsed === null) continue;
    const lowestParsed = lowest === null ? null : parseSemver(lowest);
    if (lowestParsed === null || compareSemver(parsed, lowestParsed) < 0) {
      lowest = version;
    }
  }
  if (lowest === null) {
    throw new Error(
      "Cannot derive the lowest hosted version: no concrete semver segment",
    );
  }
  return lowest;
}

/**
 * Cloudflare's `_redirects` budget, per the Workers static-assets redirect
 * documentation: a file may carry 2,000 static rules and 100 dynamic
 * (wildcard) rules, for a combined total of 2,100. Exceeding either per-kind
 * budget fails deployment (code 100324 for the dynamic one). `wrangler deploy
 * --dry-run` — the command this repository's gates run — does not evaluate
 * these limits, so the mechanism checks them itself and fails the build closed
 * instead of shipping a tree the API will reject.
 *
 * The static budget is 2,000, not 2,100: 2,100 is the combined ceiling, so a
 * guard that only compared the total would let a static-only tree of
 * 2,001-2,100 rules build green and fail in production — the failure this
 * guard exists to prevent.
 */
export const CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT = 100;
export const CLOUDFLARE_STATIC_REDIRECT_LIMIT = 2000;
export const CLOUDFLARE_TOTAL_REDIRECT_LIMIT = 2100;

/** A rule is dynamic when its pattern carries a wildcard or a placeholder. */
function isDynamicRedirectLine(line: string): boolean {
  const pattern = line.split(/\s+/)[0] ?? "";
  return pattern.includes("*") || /:[a-zA-Z]/.test(pattern);
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
      // `new` is the descendants prefix (the wildcard base and the pattern the
      // static alias stubs derive from); the exact rule uses `index_new` when
      // the entry names a separate rendered route (bitty-website#104).
      const splatTo = `/docs/${version}${entry.new.slice("/docs".length)}`;
      const to =
        entry.index_new === undefined
          ? splatTo
          : `/docs/${version}${entry.index_new.slice("/docs".length)}`;
      if (!isExactPathPrefix(from) || !isExactPathPrefix(to)) {
        throw new Error(
          `Expanded redirect is not an exact prefix: ${from} -> ${to}`,
        );
      }
      const existing = byFrom.get(from);
      const nextSplat = entry.index_new === undefined ? undefined : splatTo;
      if (
        existing !== undefined &&
        (existing.to !== to || existing.splat_to !== nextSplat)
      ) {
        throw new Error(
          `Conflicting redirect targets for ${from}: ${existing.to} vs ${to}`,
        );
      }
      byFrom.set(from, {
        from,
        to,
        ...(nextSplat === undefined ? {} : { splat_to: nextSplat }),
        status: entry.status,
        reason: entry.reason,
        effective_version: entry.effective_version,
        version,
        ...(entry.descendants === undefined
          ? {}
          : { descendants: entry.descendants }),
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
 * A redirect target is a wildcard when it still carries an unresolved
 * wildcard (`*`) or placeholder (`:name`) token. The deployed evidence
 * artifact (`renderRedirectEvidence`) records only resolved
 * `/docs/<version>/...` prefixes for every rule — a subtree move's
 * `:splat` form is synthesized solely into `dist/_redirects` — so no target
 * in `dist/redirects.json` is a wildcard today. The predicate keeps the
 * render assertion below from ever statically resolving such a token.
 */
export function isWildcardRedirectTarget(target: string): boolean {
  return target.includes("*") || /(?:^|\/):[A-Za-z]/u.test(target);
}

/** Outcome of `assertRedirectTargetsRender`, reported by the dist gate. */
export type RedirectTargetAssertion = {
  /** Rules whose exact target was proved to render a page. */
  readonly exactTargets: number;
  /** Wildcard bases proved to prefix at least one published route. */
  readonly wildcardBases: number;
  /** Rules skipped because their target still carries a wildcard token. */
  readonly skipped: number;
};

/** Published route paths (`/docs/<version>/<slug>/`) of a dist page set. */
function publishedRoutePaths(
  knownPages: ReadonlySet<string>,
): ReadonlySet<string> {
  const routes = new Set<string>();
  for (const page of knownPages) {
    if (!page.endsWith("index.html")) continue;
    routes.add(`/${page.slice(0, -"index.html".length)}`);
  }
  return routes;
}

/**
 * Dist render assertion (bitty-website#104). RD-4 requires every `new` to
 * resolve to a currently published route, but the deploy gate asserted only
 * the publication-policy targets, so a target whose directory root the mirror
 * never renders (`README.md` routes to `<dir>/readme/`) shipped as a 301 into
 * a 404 — the 36 bitty-docs#257 partition-migration rules.
 *
 * A subtree move emits two rules with two different targets (the split
 * `index_new` / `new`), so the assertion checks both arms against the same
 * `dist/` the deploy uploads:
 *
 * - exact arm: the exact rule target must be a page in the build. A bare
 *   directory prefix that renders nothing fails, naming rule and target.
 * - wildcard arm: the splat base must be a *proper* prefix of at least one
 *   published route, i.e. a real route must live strictly under it. A base
 *   that is itself a leaf (`.../readme/`, the shape the broken #104 fix
 *   produced) has no descendant routes and fails, naming rule and base.
 *
 * Rules whose exact target still carries a wildcard token are skipped
 * (unresolvable statically) and counted, so the caller reports the exemption
 * instead of the assertion silently narrowing.
 *
 * @param redirects - the `redirects` array of `dist/redirects.json`
 * @param knownPages - dist-relative HTML paths (`docs/<version>/<slug>/index.html`)
 * @returns per-arm counts and the number of wildcard-target skips
 * @throws when a target is malformed, an exact target has no page, or a splat
 *   base has no published route strictly beneath it
 */
export function assertRedirectTargetsRender(
  redirects: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly splat_to?: string;
  }>,
  knownPages: ReadonlySet<string>,
): RedirectTargetAssertion {
  const routes = publishedRoutePaths(knownPages);
  let exactTargets = 0;
  let wildcardBases = 0;
  let skipped = 0;
  for (const rule of redirects) {
    if (isWildcardRedirectTarget(rule.to)) {
      skipped += 1;
      continue;
    }
    if (!rule.to.startsWith("/docs/") || !rule.to.endsWith("/")) {
      throw new Error(
        `Redirect target must be an exact /docs/ route prefix ending with /: ${rule.from} -> ${rule.to}`,
      );
    }
    const page = `${rule.to.slice(1)}index.html`;
    if (!knownPages.has(page)) {
      throw new Error(
        `Redirect target does not render a page: ${rule.from} -> ${rule.to} (no ${page} in the build); the deploy would serve a 301 into a 404 (bitty-website#104)`,
      );
    }
    exactTargets += 1;
    if (rule.splat_to === undefined) continue;
    if (!rule.splat_to.startsWith("/docs/") || !rule.splat_to.endsWith("/")) {
      throw new Error(
        `Redirect wildcard base must be an exact /docs/ route prefix ending with /: ${rule.from} -> ${rule.splat_to}:splat`,
      );
    }
    const base = rule.splat_to;
    const hasDescendant = [...routes].some(
      (route) => route.startsWith(base) && route.length > base.length,
    );
    if (!hasDescendant) {
      throw new Error(
        `Redirect wildcard base prefixes no published route: ${rule.from} -> ${base}:splat (no published route lives under ${base}); every descendant URL would 301 into a 404 (bitty-website#104)`,
      );
    }
    wildcardBases += 1;
  }
  return { exactTargets, wildcardBases, skipped };
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
    const oldBase = toSlug(entry.old);
    const newBase = toSlug(entry.new);
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

/** Route segment the route mapper gives a corpus directory's index file
 * (`README.md`), see `src/lib/docsRoutes.ts` (`<dir>/README.md` ->
 * `<dir>/readme/`). */
const SECTION_INDEX_SLUG = "readme";

/**
 * Section-root aliases (bitty-website#137). A corpus directory's index page is
 * its `README.md`, which the route mapper renders at `<dir>/readme/`, so the
 * directory root itself renders nothing. A reader who types the section name,
 * follows a stale bookmark, or follows a relative link one level up from a
 * child page therefore landed on the 404 document - which is how the gap
 * surfaced (bitty-terminal-docs#134 had to name `../readme/` instead of `../`).
 *
 * The alias is derived from the published route identity already in hand, so no
 * second route mapper is introduced (RM-6), and the docs route renders it as
 * the same 301 stub a legacy alias gets: the section keeps exactly one
 * canonical route and the sitemap keeps skipping stubs. A directory that
 * already renders is left alone, as is the revision index (the corpus root).
 */
export function buildSectionRootAliases(
  canonicalSlugs: readonly string[],
  entries: readonly RedirectEntry[] = [],
): Map<string, string> {
  const canonical = new Set(canonicalSlugs);
  const aliases = new Map<string, string>();
  const add = (alias: string, target: string): void => {
    const existing = aliases.get(alias);
    if (existing !== undefined && existing !== target) {
      throw new Error(
        `Section-root alias "${alias}" maps to both "${existing}" and "${target}"`,
      );
    }
    aliases.set(alias, target);
  };
  const suffix = `/${SECTION_INDEX_SLUG}`;
  // An ordinary directory: its own index renders, so the root lands on it.
  for (const slug of canonicalSlugs) {
    if (!slug.endsWith(suffix)) continue;
    const dir = slug.slice(0, -suffix.length);
    if (dir.length === 0 || canonical.has(dir)) continue;
    add(dir, slug);
  }
  // A partition whose index the publication policy withholds (#97): no
  // `<dir>/readme/` exists to derive from, but the manifest already names where
  // the directory root must land - `index_new`, the same target the legacy
  // exact rule uses - so both namespaces land on one page instead of a second,
  // invented "first child" rule (bitty-website#141).
  for (const entry of entries) {
    // An entry without `index_new` names no curated landing for its root (the
    // legacy exact rule uses `new` in that case, which is the very directory
    // root this alias would itself serve). Skip rather than invent one.
    if (entry.index_new === undefined) continue;
    const base = toSlug(entry.new);
    const target = toSlug(entry.index_new);
    if (base.length === 0 || canonical.has(base)) continue;
    if (!canonical.has(target)) {
      throw new Error(
        `Section-root alias "${base}" would land on "${target}", which no published route renders (bitty-website#141)`,
      );
    }
    add(base, target);
  }
  return aliases;
}

/**
 * Dist render assertion for the same invariant (bitty-website#137). Every
 * rendered section index (`<dir>/readme/`) must be reachable at its section
 * root (`<dir>/`), or a reader reaching the section root gets the 404 document
 * even though the section page exists one level down.
 *
 * Reachable means any of the three ways the deployed URL space serves a root:
 * the build renders it (the derived section-root alias, which is what a
 * canonical section gets), an exact redirect rule names it (a legacy partition
 * root), or a wildcard rule covers it (the legacy namespace's descendants).
 * All three are read from the artifacts the deploy uploads, so a root that no
 * artifact serves fails instead of being assumed reachable.
 *
 * @param knownPages - dist-relative HTML paths (`docs/<version>/<slug>/index.html`)
 * @param redirects - the `redirects` array of `dist/redirects.json`
 * @returns the number of section indexes proved to be reachable
 * @throws when a section index renders and its root is unreachable
 */
export function assertSectionRootsRender(
  knownPages: ReadonlySet<string>,
  redirects: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly splat_to?: string;
  }>,
): number {
  const routes = publishedRoutePaths(knownPages);
  const exactSources = new Set<string>();
  const wildcardBases: string[] = [];
  for (const rule of redirects) {
    // `dist/redirects.json` records the wildcard arm as `splat_to` and keeps
    // `from` wildcard-free; `_redirects` writes the `*` itself. Accept either
    // spelling so the two artifacts cannot disagree here.
    if (rule.from.endsWith("*")) wildcardBases.push(rule.from.slice(0, -1));
    else if (rule.splat_to !== undefined) wildcardBases.push(rule.from);
    else exactSources.add(rule.from);
  }
  const suffix = `/${SECTION_INDEX_SLUG}/`;
  let roots = 0;
  for (const route of routes) {
    if (!route.endsWith(suffix)) continue;
    const dir = route.slice(0, -suffix.length);
    // A version root renders at `/docs/<version>/` itself; there is no section
    // root above it to resolve.
    if (dir === "") {
      roots += 1;
      continue;
    }
    const root = `${dir}/`;
    const reachable =
      routes.has(root) ||
      exactSources.has(dir) ||
      exactSources.has(root) ||
      // A `*` matches an empty splat, so a wildcard base covers the root it
      // sits on as well as its descendants - production answers the legacy
      // partition roots with exactly that rule shape, and a reader following it
      // lands on the section index (verified live for all twelve before this
      // gate was written).
      wildcardBases.some((base) => root.startsWith(base));
    if (!reachable) {
      throw new Error(
        `Section root does not resolve: ${root} (its index ${route} renders, so a reader reaching the section root gets the 404 document; bitty-website#137)`,
      );
    }
    roots += 1;
  }
  return roots;
}

/**
 * A redirect stub must land on a page. A root that resolves to another stub is
 * a chain, and a chain that ends nowhere is indistinguishable to a reader from
 * no route at all (bitty-website#141).
 *
 * @param stubs - parsed stubs: the route that serves the stub, and the path its
 *   refresh points at
 * @param knownPages - dist-relative HTML paths (`docs/<version>/<slug>/index.html`)
 * @returns the number of stubs proved to land on a rendered page
 * @throws when a stub's target is not a rendered page
 */
export function assertRedirectStubsLandOnPages(
  stubs: ReadonlyArray<{ readonly route: string; readonly target: string }>,
  knownPages: ReadonlySet<string>,
): number {
  const routes = publishedRoutePaths(knownPages);
  // A stub's own route is emitted HTML, so membership in `routes` alone cannot
  // tell a landing from a hop: exclude the stub routes themselves, or a chain
  // would satisfy the very gate meant to fail it.
  const stubRoutes = new Set(stubs.map((stub) => stub.route));
  for (const stub of stubs) {
    if (stubRoutes.has(stub.target)) {
      throw new Error(
        `Redirect stub ${stub.route} lands on another stub (${stub.target}); a stub must land on a page (bitty-website#141)`,
      );
    }
    if (!routes.has(stub.target)) {
      throw new Error(
        `Redirect stub ${stub.route} points at ${stub.target}, which no page renders (a stub must land on a page; bitty-website#141)`,
      );
    }
  }
  return stubs.length;
}

/**
 * Whether the emitter writes a `:splat` wildcard rule for this entry: a
 * subtree move carries descendants, a publication demotion and any entry
 * explicitly marked `descendants: false` (leaf route moves, #98 §5) do not.
 * The dist assertion reads the same predicate through the evidence artifact,
 * so `dist/_redirects` and `dist/redirects.json` cannot describe different
 * rule sets.
 */
function emitsDescendantsWildcard(rule: ExpandedRedirectRule): boolean {
  if (rule.reason === PUBLICATION_REDIRECT_REASON) return false;
  return rule.descendants !== false;
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
    // Cloudflare counts a rule with a wildcard as *dynamic*: 100 dynamic and
    // 2,000 static rules per file, 2,100 in total. A publication demotion
    // targets a leaf page that has no descendants, so the exact rule above is
    // the whole rule; emitting the wildcard form as well spent 156 of the 100
    // dynamic slots and made the production deploy fail (code 100324). The
    // same applies to any entry explicitly marked `descendants: false` (leaf
    // route moves, #98 §5); subtree moves keep the wildcard form because they
    // carry descendants. The wildcard base is the descendants prefix
    // (`splat_to`), which for a split entry differs from the exact target
    // (`to`, bitty-website#104).
    if (!emitsDescendantsWildcard(rule)) continue;
    lines.push(
      `${rule.from}* ${rule.splat_to ?? rule.to}:splat ${rule.status}`,
    );
  }
  const ruleLines = lines.filter((line) => !line.startsWith("#"));
  const dynamicRules = ruleLines.filter(isDynamicRedirectLine);
  const staticRuleCount = ruleLines.length - dynamicRules.length;
  if (dynamicRules.length > CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT) {
    throw new Error(
      `_redirects uses ${dynamicRules.length} dynamic rules, above Cloudflare's limit of ${CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT} (deployment code 100324): ${dynamicRules
        .slice(0, 3)
        .map((line) => line.split(/\s+/)[0])
        .join(", ")} ...`,
    );
  }
  if (staticRuleCount > CLOUDFLARE_STATIC_REDIRECT_LIMIT) {
    throw new Error(
      `_redirects uses ${staticRuleCount} static rules, above Cloudflare's limit of ${CLOUDFLARE_STATIC_REDIRECT_LIMIT} (2,100 is the combined ceiling, not the per-kind one)`,
    );
  }
  if (ruleLines.length > CLOUDFLARE_TOTAL_REDIRECT_LIMIT) {
    throw new Error(
      `_redirects uses ${ruleLines.length} rules, above Cloudflare's combined limit of ${CLOUDFLARE_TOTAL_REDIRECT_LIMIT}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * `dist/redirects.json` per-deployment evidence (RD-6).
 *
 * Each row mirrors the rules the deploy emits for one entry: `to` is the
 * exact rule target, and `splat_to` (present exactly when a `:splat` wildcard
 * rule is emitted) is the descendants prefix that wildcard rebases onto —
 * `new` for the bitty-website#104 split entries. Keeping `splat_to` beside
 * `to` lets the dist assertion check both arms against the artifact the
 * deploy uploads.
 */
export function renderRedirectEvidence(
  table: readonly ExpandedRedirectRule[],
  meta: {
    /** One entry per consumed source (bitty-website#98): id → resolved SHA. */
    readonly docsRevisions: Readonly<Record<string, string>>;
    readonly hostedVersions: readonly string[];
  },
): string {
  const payload = {
    source: "bitty-website",
    docs_revisions: { ...meta.docsRevisions },
    hosted_versions: [...meta.hostedVersions],
    redirects: table.map((rule) => ({
      from: rule.from,
      to: rule.to,
      ...(emitsDescendantsWildcard(rule)
        ? { splat_to: rule.splat_to ?? rule.to }
        : {}),
      status: rule.status,
      reason: rule.reason,
      effective_version: rule.effective_version,
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
