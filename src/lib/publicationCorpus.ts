/**
 * Publication corpus reader (bitty-website#97, closing website#102 D2/D6).
 *
 * The pinned `src/content/docs/` mirror is read once, in one place, into the
 * exact input the publication policy decides on:
 *
 * - the docs route page (`../pages/docs/[version]/[...slug].astro`) resolves
 *   its eligible set from the same policy over the Astro collection;
 * - the sync/check pipeline (`../../scripts/sync-docs.mjs`,
 *   `../../scripts/check-docs-sync.mjs`) evaluates this module, so the
 *   `N publishable` count it prints describes the set the build publishes;
 * - the build integrations (`../../astro.config.mjs`) take the redirect plan
 *   from here, so excluded routes ship 301s through the one redirect
 *   mechanism instead of 404ing.
 *
 * This module owns no rule: eligibility comes from `./publicationPolicy.ts`,
 * route identities from `./docsRoutes.ts`. It only turns Markdown
 * frontmatter into the policy's typed input and derives the redirect plan for
 * the pages the policy excludes.
 *
 * The pinned mirror is consumed byte-for-byte and its frontmatter is owned by
 * bitty-docs, so the frontmatter flip that removes `website_publish: true`
 * from a demoted page is a coordinated cross-repository change. Until that
 * lands, the demoted pages are recorded in `./publication-flip-list.json` and
 * are the pages that ship the 301s (see {@link loadPublicationCorpus}).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  nearestPublishedAncestor,
  sourcePathToRouteIdentity,
} from "./docsRoutes.ts";
import {
  assertPublicationPolicy,
  type PublicationMetadata,
  type PublicationPolicyReport,
} from "./publicationPolicy.ts";
import type { PublicationRedirectPlan } from "./redirects.ts";

/** Mirror-relative directory that holds the pinned `docs/...` corpus. */
export const MIRROR_DOCS_DIR = "docs";

/** Route of the revision index: the last-resort redirect target. */
export const REVISION_INDEX_ROUTE = "/docs/";

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;
const FRONTMATTER_FIELD = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/u;
const QUOTED_VALUE = /^["'](.*)["']$/u;
const MARKDOWN_SUFFIX = ".md";

export type PublicationCorpus = {
  /** Full policy evaluation of the corpus (counts + every problem found). */
  readonly report: PublicationPolicyReport;
  /** Repo-relative `docs/...md` source paths of the published pages. */
  readonly publishedSources: readonly string[];
  /** Version-less `/docs/.../` routes of the published pages. */
  readonly publishedRoutes: readonly string[];
  /** 301 plan for the excluded pages, sorted by `from`. */
  readonly redirects: readonly PublicationRedirectPlan[];
};

/**
 * Flat `key: value` frontmatter of one document.
 *
 * The shared docs schema is strict and flat (eight scalar fields), so a
 * line-oriented reader is exact here; a field that opens a nested block or
 * list is skipped rather than guessed at.
 *
 * @throws when `sourcePath` has no frontmatter block
 */
export function frontmatterFields(
  body: string,
  sourcePath: string,
): ReadonlyMap<string, string> {
  const block = FRONTMATTER_BLOCK.exec(body);
  if (block === null || block[1] === undefined) {
    throw new Error(`${sourcePath} has no frontmatter block`);
  }
  const fields = new Map<string, string>();
  for (const line of block[1].split(/\r?\n/u)) {
    const match = FRONTMATTER_FIELD.exec(line);
    if (match === null || match[1] === undefined) continue;
    const raw = (match[2] ?? "").trim();
    if (raw.length === 0) continue;
    fields.set(match[1], raw.replace(QUOTED_VALUE, "$1"));
  }
  return fields;
}

/**
 * Publication metadata of one corpus document — the policy's input, derived
 * from the frontmatter the shared schema validates.
 *
 * @throws when a field the policy reads is missing or not a boolean string
 */
export function publicationMetadataFromMarkdown(
  sourcePath: string,
  body: string,
): PublicationMetadata {
  const fields = frontmatterFields(body, sourcePath);
  const read = (key: string): string => {
    const value = fields.get(key);
    if (value === undefined) {
      throw new Error(`${sourcePath} frontmatter is missing "${key}"`);
    }
    return value;
  };
  const websitePublish = read("website_publish");
  if (websitePublish !== "true" && websitePublish !== "false") {
    throw new Error(
      `${sourcePath} frontmatter website_publish must be true or false, found "${websitePublish}"`,
    );
  }
  const status = fields.get("status");
  return {
    sourcePath,
    audience: read("audience"),
    document_type: read("document_type"),
    website_publish: websitePublish === "true",
    ...(status === undefined ? {} : { status }),
  };
}

async function markdownFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const relative =
        prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), relative);
      } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_SUFFIX)) {
        found.push(relative);
      }
    }
  }
  await walk(root, "");
  return found;
}

/** Every `docs/...md` document of a materialized mirror, sorted by path. */
export async function readPublicationCorpus(
  mirrorRoot: string,
): Promise<readonly PublicationMetadata[]> {
  const root = join(mirrorRoot, MIRROR_DOCS_DIR);
  const documents: PublicationMetadata[] = [];
  for (const relative of await markdownFiles(root)) {
    const body = await readFile(join(root, relative), "utf8");
    documents.push(
      publicationMetadataFromMarkdown(`${MIRROR_DOCS_DIR}/${relative}`, body),
    );
  }
  return documents;
}

function routeOf(meta: PublicationMetadata): string {
  return sourcePathToRouteIdentity(meta.sourcePath).routeWithoutVersion;
}

/**
 * Evaluate the whole mirror against the policy (fail closed) and derive the
 * redirect plan for the excluded pages.
 *
 * The plan covers every page that requests publication and is not published —
 * the demotion set, which is exactly the docs-side flip list at this
 * revision. A page that never asked for publication was never routed, so
 * there is no served URL to redirect away from.
 *
 * @throws {@link PublicationPolicyError} when any page requests publication
 *   without being eligible, allow-listed, or recorded as pending the
 *   docs-side flip, when either data file is stale, or when the published set
 *   leaves its band — and when the revision index itself is unpublished,
 *   because then no exclusion has a surviving redirect target.
 */
export async function loadPublicationCorpus(
  mirrorRoot: string,
): Promise<PublicationCorpus> {
  const report = assertPublicationPolicy(
    await readPublicationCorpus(mirrorRoot),
  );
  const publishedSources = report.published.map((meta) => meta.sourcePath);
  const publishedRoutes = report.published.map(routeOf);
  const publishedRouteSet = new Set(publishedRoutes);
  if (!publishedRouteSet.has(REVISION_INDEX_ROUTE)) {
    throw new Error(
      `the revision index (${REVISION_INDEX_ROUTE}) must stay published: it is the last-resort redirect target for every excluded page`,
    );
  }
  const redirects = report.demoted
    .map((meta) => {
      const from = routeOf(meta);
      const to = nearestPublishedAncestor(from, publishedRouteSet);
      if (to === null) {
        throw new Error(
          `no published ancestor route for excluded page ${meta.sourcePath} (${from})`,
        );
      }
      return { from, to };
    })
    .sort((left, right) => left.from.localeCompare(right.from));
  return { report, publishedSources, publishedRoutes, redirects };
}
