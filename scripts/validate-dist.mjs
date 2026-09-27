import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { flipListEntries } from "../src/lib/publicationPolicy.ts";
import { loadPublicationCorpus } from "../src/lib/publicationCorpus.ts";
import {
  assertPublishedUnderMounts,
  parseDocsManifest,
  parseDocsPinSet,
} from "../src/lib/docsPins.ts";
import {
  DOCS_PROVENANCE_FILENAME,
  assertDocsProvenanceMatches,
  assertVersionsCorpusSet,
} from "../src/lib/docsProvenance.ts";
import {
  CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT,
  CLOUDFLARE_TOTAL_REDIRECT_LIMIT,
  PUBLICATION_REDIRECT_REASON,
} from "../src/lib/redirects.ts";
import { sitemapRoutes } from "../src/lib/sitemap.ts";

const dist = new URL("../dist/", import.meta.url);
const immutable = "public, max-age=31536000, immutable";
const revalidate = "public, max-age=0, must-revalidate";

async function requireFile(path, { nonEmpty = false } = {}) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing required build output: ${path.pathname}`);
  }

  if (nonEmpty && (await readFile(path, "utf8")).length === 0) {
    throw new Error(`Empty required build output: ${path.pathname}`);
  }
}

function parseHeaderRules(source) {
  const rules = new Map();
  let activeRule;

  for (const line of source.split(/\r?\n/u)) {
    if (line.startsWith("/")) {
      activeRule = line;
      rules.set(activeRule, new Map());
      continue;
    }

    const header = line.match(/^\s+([^:]+):\s*(.+)$/u);
    if (header && activeRule) {
      rules.get(activeRule).set(header[1].toLowerCase(), header[2]);
    }
  }

  return rules;
}

function requireCacheRule(rules, route, expectedValue) {
  const cacheControl = rules.get(route)?.get("cache-control");
  if (cacheControl !== expectedValue) {
    throw new Error(
      `[${route}] Cache-Control must be "${expectedValue}", received "${cacheControl ?? "missing"}"`,
    );
  }
}

await requireFile(new URL("index.html", dist));
await requireFile(new URL("_redirects", dist), { nonEmpty: true });
await requireFile(new URL("redirects.json", dist), { nonEmpty: true });
await requireFile(new URL("_headers", dist), { nonEmpty: true });
await requireFile(new URL("search-index.json", dist), { nonEmpty: true });

// Site search (CTX-0040): every index record must resolve to a rendered
// page — the same known-pages idea as the link audit. Slugs are canonical
// (version-less), so they are checked against the `latest` segment; the
// search box replays the same slug under the page's own segment at runtime.
async function collectDistPages(root) {
  const pages = new Set();
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        pages.add(
          path
            .slice(root.length + 1)
            .split("\\")
            .join("/"),
        );
      }
    }
  }
  await walk(root);
  return pages;
}

const distDir = fileURLToPath(dist).replace(/\/+$/u, "");
const knownPages = await collectDistPages(distDir);
const records = JSON.parse(
  await readFile(new URL("search-index.json", dist), "utf8"),
);
if (!Array.isArray(records) || records.length === 0) {
  throw new Error("search-index.json must hold a non-empty record array");
}
for (const record of records) {
  if (
    typeof record?.slug !== "string" ||
    typeof record?.title !== "string" ||
    record.title.length === 0 ||
    typeof record?.text !== "string" ||
    record.text.length === 0
  ) {
    throw new Error("search-index.json holds a record without slug/title/text");
  }
  const page =
    record.slug === ""
      ? "docs/latest/index.html"
      : `docs/latest/${record.slug}/index.html`;
  if (!knownPages.has(page)) {
    throw new Error(`search-index.json points at missing page: ${page}`);
  }
}

async function requireAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  throw new Error(`Unexpected Worker bundle: ${path.pathname}`);
}

await requireAbsent(new URL("_worker.js", dist));

const rules = parseHeaderRules(
  await readFile(new URL("_headers", dist), "utf8"),
);
requireCacheRule(rules, "/_astro/*", immutable);
requireCacheRule(rules, "/icons/*", revalidate);
requireCacheRule(rules, "/", revalidate);

// ---------------------------------------------------------------------------
// Publication policy (website#97): the dist must prove, from the artifacts
// themselves, that an excluded page left the site as a 301 and that neither
// the sitemap nor the search index can still point at it.
// ---------------------------------------------------------------------------

function urlPathFromRoute(route) {
  if (route === "/") return "index.html";
  if (!route.startsWith("/docs/") || !route.endsWith("/")) {
    throw new Error(`Expected an exact /docs/ route prefix: ${route}`);
  }
  return `${route.slice(1)}index.html`;
}

function resolveRedirectTarget(rule) {
  if (typeof rule?.to !== "string" || !rule.to.startsWith("/docs/")) {
    throw new Error(
      `redirects.json holds a rule without a /docs/ target: ${JSON.stringify(rule)}`,
    );
  }
  return urlPathFromRoute(rule.to);
}

const evidence = JSON.parse(
  await readFile(new URL("redirects.json", dist), "utf8"),
);
const allRules = Array.isArray(evidence?.redirects) ? evidence.redirects : [];
const policyRules = allRules.filter(
  (rule) => rule?.reason === PUBLICATION_REDIRECT_REASON,
);
if (policyRules.length === 0) {
  throw new Error(
    "redirects.json holds no publication-policy redirect: an excluded page would 404",
  );
}

const edgeRedirects = await readFile(new URL("_redirects", dist), "utf8");
for (const rule of policyRules) {
  if (rule.status !== 301) {
    throw new Error(
      `publication redirect ${rule.from} must be a 301, received ${rule.status}`,
    );
  }
  await requireFile(new URL(resolveRedirectTarget(rule), dist));
  try {
    await access(new URL(urlPathFromRoute(rule.from), dist));
    throw new Error(
      `excluded page still emits a page: ${rule.from} (expected the 301 to ${rule.to})`,
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!edgeRedirects.includes(`${rule.from} ${rule.to} 301`)) {
    throw new Error(
      `dist/_redirects is missing the publication rule "${rule.from} ${rule.to} 301"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Multi-source aggregation gates (bitty-website#98 §3.2 / task T4). The
// deployed artifacts must prove that the declared mounts cover every published
// page, that the redirect evidence names every pinned revision, and that the
// edge rules stay inside Cloudflare's rule budget with leaf moves emitted
// exact-only (no dynamic wildcard).
// ---------------------------------------------------------------------------
const pinSet = parseDocsPinSet(
  JSON.parse(
    await readFile(
      new URL("../src/content/docs-revision.json", import.meta.url),
      "utf8",
    ),
  ),
);
// Mounts must be disjoint so every mirror path resolves to exactly one source;
// parseDocsPinSet enforces that. Assert published-page provenance explicitly.
assertPublishedUnderMounts(
  (
    await loadPublicationCorpus(
      fileURLToPath(new URL("../src/content/docs", import.meta.url)),
    )
  ).publishedSources,
  pinSet,
);

const docsRevisions = evidence.docs_revisions;
if (
  docsRevisions === null ||
  typeof docsRevisions !== "object" ||
  Array.isArray(docsRevisions)
) {
  throw new Error(
    "dist/redirects.json must carry docs_revisions (one entry per pinned source)",
  );
}
for (const source of pinSet.sources) {
  if (docsRevisions[source.id] !== source.revision) {
    throw new Error(
      `dist/redirects.json docs_revisions["${source.id}"] must be ${source.revision}, received ${docsRevisions[source.id] ?? "missing"}`,
    );
  }
}
// Every pinned source must be present AND nothing else: stale evidence for a
// removed source would otherwise keep validating after its pin is gone.
const pinnedIds = new Set(pinSet.sources.map((source) => source.id));
for (const id of Object.keys(docsRevisions)) {
  if (!pinnedIds.has(id)) {
    throw new Error(
      `dist/redirects.json docs_revisions holds unknown source "${id}"; expected exactly the pinned source(s) ${[...pinnedIds].join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Deployed provenance evidence (bitty-website#98, task T9). The artifact the
// build emitted is re-derived from the pins and the committed manifest and
// checked against EACH OTHER — and against the redirect evidence and the
// version record — so a deploy cannot claim a corpus set the build did not
// consume.
// ---------------------------------------------------------------------------
await requireFile(new URL(DOCS_PROVENANCE_FILENAME, dist), { nonEmpty: true });
const manifest = parseDocsManifest(
  JSON.parse(
    await readFile(
      new URL("../src/content/docs-manifest.json", import.meta.url),
      "utf8",
    ),
  ),
);
const provenance = assertDocsProvenanceMatches(
  JSON.parse(await readFile(new URL(DOCS_PROVENANCE_FILENAME, dist), "utf8")),
  pinSet,
  manifest,
);
// The artifact and dist/redirects.json must name the same revisions: the
// redirect evidence is what the edge serves, the artifact is the audit trail.
for (const source of provenance.sources) {
  if (docsRevisions[source.id] !== source.revision) {
    throw new Error(
      `dist/docs-provenance.json source "${source.id}" must carry revision ${source.revision}, but dist/redirects.json docs_revisions says ${docsRevisions[source.id] ?? "missing"}`,
    );
  }
}
// The expected publication-redirect count is COMPUTED as the sum over sources
// (each source's demoted count times the hosted segments), never a hardcoded
// number or a per-source literal. The artifact is the authority; the policy
// flip list is cross-checked against it so the artifact cannot describe a
// demotion set the policy does not ship.
const demotedTotal = provenance.sources.reduce(
  (sum, source) => sum + source.counts.demoted,
  0,
);
if (demotedTotal !== flipListEntries().length) {
  throw new Error(
    `dist/docs-provenance.json sums ${demotedTotal} demoted page(s) across ${provenance.sources.length} source(s); the publication flip list holds ${flipListEntries().length}`,
  );
}
const expectedPolicyRules = demotedTotal * evidence.hosted_versions.length;
if (policyRules.length !== expectedPolicyRules) {
  throw new Error(
    `redirects.json holds ${policyRules.length} publication redirect(s); expected ${provenance.sources
      .map((source) => `"${source.id}"=${source.counts.demoted}`)
      .join(
        " + ",
      )} = ${demotedTotal} demoted page(s) x ${evidence.hosted_versions.length} hosted version(s) = ${expectedPolicyRules}`,
  );
}
// The version record names the corpus set the build consumed; a pin advance
// changes the derived id, so a stale version record fails the deploy gate
// (`assertVersionsCorpusSet` carries the message).
assertVersionsCorpusSet(
  JSON.parse(
    await readFile(
      new URL("../src/content/versions.json", import.meta.url),
      "utf8",
    ),
  ).versions,
  pinSet,
);

const edgeRuleLines = edgeRedirects
  .split(/\r?\n/u)
  .filter((line) => line.length > 0 && !line.startsWith("#"));
const dynamicEdgeRules = edgeRuleLines.filter((line) => {
  const pattern = line.split(/\s+/u)[0] ?? "";
  return pattern.includes("*") || /:[a-zA-Z]/u.test(pattern);
});
if (dynamicEdgeRules.length > CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT) {
  throw new Error(
    `dist/_redirects has ${dynamicEdgeRules.length} dynamic rules, over Cloudflare's ${CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT}-dynamic-rule limit`,
  );
}
if (edgeRuleLines.length > CLOUDFLARE_TOTAL_REDIRECT_LIMIT) {
  throw new Error(
    `dist/_redirects has ${edgeRuleLines.length} rules, over Cloudflare's ${CLOUDFLARE_TOTAL_REDIRECT_LIMIT}-rule limit`,
  );
}
for (const rule of policyRules) {
  if (dynamicEdgeRules.some((line) => line.startsWith(`${rule.from}*`))) {
    throw new Error(
      `publication redirect ${rule.from} must be exact-only; dist/_redirects has a dynamic wildcard rule for it`,
    );
  }
}

const excludedRoutes = new Set(policyRules.map((rule) => rule.from));
const sitemaps = [
  { label: "sitemap.xml", url: new URL("sitemap.xml", dist) },
  ...evidence.hosted_versions.map((segment) => ({
    label: `docs/${segment}/sitemap.xml`,
    url: new URL(`docs/${segment}/sitemap.xml`, dist),
  })),
];
const sitemapCounts = [];
for (const { label, url } of sitemaps) {
  await requireFile(url, { nonEmpty: true });
  const routes = sitemapRoutes(await readFile(url, "utf8"));
  for (const route of routes) {
    if (excludedRoutes.has(route)) {
      throw new Error(
        `${label} lists excluded route ${route}; only published pages may be canonical`,
      );
    }
    if (!knownPages.has(urlPathFromRoute(route))) {
      throw new Error(`${label} points at missing page: ${route}`);
    }
  }
  sitemapCounts.push(`${label}=${routes.length}`);
}
for (const record of records) {
  const route =
    record.slug === "" ? "/docs/latest/" : `/docs/latest/${record.slug}/`;
  if (excludedRoutes.has(route)) {
    throw new Error(
      `search-index.json lists excluded route ${route}; only published pages may be indexed`,
    );
  }
}

console.log(
  `Static output and cache-header validation passed (${records.length} search record(s), ${policyRules.length} publication redirect(s), sitemaps ${sitemapCounts.join(", ")}).`,
);
