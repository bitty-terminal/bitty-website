import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import docsRevision from "./src/content/docs-revision.json" with { type: "json" };
import docsManifest from "./src/content/docs-manifest.json" with { type: "json" };
import versions from "./src/content/versions.json" with { type: "json" };
import { CDN_BASE_URL } from "./src/lib/cdn.ts";
import {
  assertPublishedUnderMounts,
  parseDocsManifest,
  parseDocsPinSet,
} from "./src/lib/docsPins.ts";
import {
  DOCS_PROVENANCE_FILENAME,
  assertVersionsCorpusSet,
  buildDocsProvenance,
} from "./src/lib/docsProvenance.ts";
import { docsLinksMdastPlugin } from "./src/lib/docsLinksPlugin.ts";
import { docsHeadingsMdastPlugin } from "./src/lib/docsHeadings.ts";
import { loadPublicationCorpus } from "./src/lib/publicationCorpus.ts";
import { sourceDirToRouteDir } from "./src/lib/docsRoutes.ts";
import {
  SEARCH_INDEX_FILENAME,
  writeSearchIndex,
} from "./src/lib/searchIndex.ts";
import { SITEMAP_FILENAME, writeSitemaps } from "./src/lib/sitemap.ts";
import {
  BASE_REDIRECTS,
  buildExpandedRedirectTable,
  buildPublicationRedirectEntries,
  loadMergedRedirects,
  lowestVersion,
  mergeRedirectEntries,
  renderEdgeRedirects,
  renderRedirectEvidence,
} from "./src/lib/redirects.ts";

/** Single deployment origin: the canonical URL of every emitted sitemap. */
const SITE_URL = "https://bitty.run";

const mirrorRoot = fileURLToPath(
  new URL("./src/content/docs", import.meta.url),
);
const mirrorDocs = join(mirrorRoot, "docs");

// Website Delivery RFC: build-time redirects are the rendered view of the
// per-version expanded redirect table (RD-3/RD-6). The static legacy redirect
// pages are generated in src/pages/docs/[version]/[...slug].astro — Astro's
// static `redirects` option cannot express a prefix rewrite onto the
// `[...slug]` catch-all route — and the same expanded table is emitted as
// Cloudflare Workers Static Assets `_redirects` plus `dist/redirects.json`
// evidence by the integration below.
const hostedVersionSegments = [
  "latest",
  "stable",
  ...versions.versions.map((v) => v.version),
];

const versionBySegment = new Map([
  ["latest", versions.latest],
  ["stable", versions.stable],
  ...versions.versions.map((v) => [v.version, v.version]),
]);

function resolveVersion(segment) {
  return versionBySegment.get(segment) ?? segment;
}

async function writeRedirectArtifacts(outDir) {
  // RD-3/RD-6 plus the publication policy (website#97): the legacy alias
  // manifest and the 301s for every page the policy excludes are merged into
  // one expanded table, so an excluded route leaves the site as a redirect
  // instead of a 404. The plan comes from the policy, never from a second
  // eligibility rule here.
  const corpus = await loadPublicationCorpus(mirrorRoot);
  // Multi-source aggregation (bitty-website#98 §3.2): a published page must
  // lie under a declared mount, so a mirror file without provenance cannot be
  // published, and the evidence below carries every source's revision.
  const pins = parseDocsPinSet(docsRevision);
  assertPublishedUnderMounts(corpus.publishedSources, pins);
  const publicationEntries = buildPublicationRedirectEntries(
    corpus.redirects,
    // An exclusion applies to every hosted segment, so the entries take
    // effect from the lowest hosted version onward (RD-4).
    lowestVersion(hostedVersionSegments.map(resolveVersion)),
  );
  const entries = mergeRedirectEntries(
    await loadMergedRedirects(),
    publicationEntries,
  );
  const table = buildExpandedRedirectTable(
    entries,
    hostedVersionSegments,
    resolveVersion,
  );
  await writeFile(
    join(outDir, "_redirects"),
    renderEdgeRedirects(table),
    "utf8",
  );
  await writeFile(
    join(outDir, "redirects.json"),
    renderRedirectEvidence(table, {
      docsRevisions: Object.fromEntries(
        pins.sources.map((source) => [source.id, source.revision]),
      ),
      hostedVersions: hostedVersionSegments,
    }),
    "utf8",
  );
}

function redirectArtifacts() {
  return {
    name: "bitty-redirect-artifacts",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await writeRedirectArtifacts(fileURLToPath(dir));
        logger.info("wrote _redirects and redirects.json (RD-3/RD-6)");
      },
    },
  };
}

// Website Delivery RFC MV-4: non-Markdown assets referenced by relative links
// (linked `*.html` diagrams, `*.yaml`, `*.json`, …) are not routable pages,
// so the Markdown rewrite in `src/lib/docsLinks.ts` points them at a
// per-version asset copy. This integration emits that copy after the static
// build: every non-`.md` file under `src/content/docs/docs/` lands at
// `dist/docs/<version>/<slugged-dir>/<basename>` for each hosted version
// segment, mirroring the document route layout so the relative references
// resolve. `![](...)` images are excluded from the rewrite and stay owned by
// Astro's asset pipeline.
//
// Fail-closed: an asset whose output path would overwrite a rendered page
// (`.../index.html` inside a route directory) aborts the build instead of
// silently shadowing the page.
async function collectAssetFiles() {
  const out = [];
  async function walk(dir, rel) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, next);
      } else if (entry.isFile() && !entry.name.endsWith(".md")) {
        out.push(next);
      }
    }
  }
  await walk(mirrorDocs, "");
  return out.sort();
}

async function writeDocsAssets(outDir, logger) {
  const assets = await collectAssetFiles();
  let skipped = 0;
  for (const rel of assets) {
    const dir = dirname(rel);
    const base = rel.slice(dir === "." ? 0 : dir.length + 1);
    let routeDir;
    try {
      routeDir = sourceDirToRouteDir(
        dir === "." ? "docs" : `docs/${dir}`,
      ).slice("/docs/".length);
    } catch {
      // Outside the routable categories: no rewritten reference can point
      // here (the link rewrite returns null for the same inputs), so there
      // is nothing to emit. Warn instead of failing future pins.
      logger.warn(`skipping docs asset outside routable categories: ${rel}`);
      skipped++;
      continue;
    }
    for (const segment of hostedVersionSegments) {
      const dest = join(outDir, "docs", segment, routeDir, base);
      try {
        await stat(dest);
        throw new Error(
          `docs asset "${rel}" would overwrite rendered output at ${relative(outDir, dest)}`,
        );
      } catch (error) {
        if (error.message.startsWith("docs asset ")) throw error;
        // Missing destination: the expected case, copy below.
      }
      await mkdir(dirname(dest), { recursive: true });
      await cp(join(mirrorDocs, rel), dest);
    }
  }
  logger.info(
    `copied ${assets.length - skipped} docs asset(s) x ${hostedVersionSegments.length} version(s), skipped ${skipped} (MV-4)`,
  );
}

function docsAssets() {
  return {
    name: "bitty-docs-assets",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await writeDocsAssets(fileURLToPath(dir), logger);
      },
    },
  };
}

// Website Delivery search (CTX-0040): the build-time static keyword index.
// Scrapes the rendered `latest` docs pages (one record per canonical slug)
// and emits `dist/search-index.json` for the lazily loaded search box. No
// server, no dependency, no framework lock-in — the same integration pattern
// as the redirect and asset emitters above.
function searchIndexArtifacts() {
  return {
    name: "bitty-search-index",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const records = await writeSearchIndex(fileURLToPath(dir));
        logger.info(
          `wrote ${SEARCH_INDEX_FILENAME} with ${records.length} record(s)`,
        );
      },
    },
  };
}

// Multi-source aggregation (bitty-website#98, task T9): the deployed
// provenance artifact. `dist/docs-provenance.json` records, for every consumed
// source, its slug, pinned revision, mount targets, per-kind counts and the
// routes it published, plus the aggregate totals and the corpus-set identity
// the build used. Every value is derived from the pins
// (`src/content/docs-revision.json`) and the committed provenance manifest
// (`src/content/docs-manifest.json`) through `src/lib/docsProvenance.ts` — the
// artifact cannot claim provenance the build did not consume. It is served
// beside the other evidence artifacts (`/redirects.json`,
// `/search-index.json`); it is not a page, so it adds no route to the sitemap
// or the search index and the website#97 publication policy is untouched.
function docsProvenanceArtifacts() {
  return {
    name: "bitty-docs-provenance",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const pins = parseDocsPinSet(docsRevision);
        const manifest = parseDocsManifest(docsManifest);
        // The version record names the corpus set the build consumed; a pin
        // advance changes the derived id, so the build fails closed until the
        // version record moves with it.
        assertVersionsCorpusSet(versions.versions, pins);
        const artifact = buildDocsProvenance(
          pins,
          manifest,
          new Date().toISOString(),
        );
        await writeFile(
          join(fileURLToPath(dir), DOCS_PROVENANCE_FILENAME),
          `${JSON.stringify(artifact, null, 2)}\n`,
          "utf8",
        );
        logger.info(
          `wrote ${DOCS_PROVENANCE_FILENAME} (corpus set ${artifact.corpus_set.id}, ${artifact.sources.length} source(s), ${artifact.aggregate.published} published)`,
        );
      },
    },
  };
}

// Website Delivery RFC MV-6: the sitemap is emitted from the built output, so
// it can only list pages the build published (the publication policy's
// excluded routes emit no page and ship a 301 instead). The global sitemap
// lists the `latest` routes as canonical; each hosted segment gets its own.
function sitemapArtifacts() {
  return {
    name: "bitty-sitemap",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const counts = await writeSitemaps(fileURLToPath(dir), {
          origin: SITE_URL,
          hostedVersions: hostedVersionSegments,
          canonicalVersion: "latest",
        });
        logger.info(
          `wrote ${SITEMAP_FILENAME} with ${counts.canonical} canonical url(s); per-version sitemaps: ${hostedVersionSegments.map((segment) => `${segment}=${counts.perVersion[segment] ?? 0}`).join(", ")}`,
        );
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  output: "static",
  outDir: "./dist",
  redirects: { ...BASE_REDIRECTS },
  // CDN hook (CDN-3): expose the R2 custom-domain origin to client code.
  // No built asset points at the CDN yet (bucket is empty until post-0.1.0
  // media lands); future lanes reference it via `cdnUrl()` in src/lib/cdn.ts.
  vite: {
    define: {
      "import.meta.env.PUBLIC_CDN_BASE_URL": JSON.stringify(CDN_BASE_URL),
    },
  },
  markdown: {
    // Dual code theme (CTX-0049, website#95): Shiki emits both palettes as
    // custom properties and global.css picks the one that matches the
    // document colour scheme. `one-light`/`one-dark-pro` sit closest to the
    // cool neutral + vermilion palette; the previous single `github-dark`
    // theme painted a dark block onto the pale page.
    shikiConfig: {
      themes: { light: "one-light", dark: "one-dark-pro" },
    },
    processor: satteri({
      mdastPlugins: [
        docsHeadingsMdastPlugin(),
        docsLinksMdastPlugin({ mirrorRoot }),
      ],
    }),
  },
  integrations: [
    redirectArtifacts(),
    docsAssets(),
    searchIndexArtifacts(),
    docsProvenanceArtifacts(),
    sitemapArtifacts(),
  ],
});
