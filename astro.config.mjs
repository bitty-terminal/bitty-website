import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import docsRevision from "./src/content/docs-revision.json" with { type: "json" };
import versions from "./src/content/versions.json" with { type: "json" };
import { docsLinksMdastPlugin } from "./src/lib/docsLinksPlugin.ts";
import { docsHeadingsMdastPlugin } from "./src/lib/docsHeadings.ts";
import { sourceDirToRouteDir } from "./src/lib/docsRoutes.ts";
import {
  BASE_REDIRECTS,
  buildExpandedRedirectTable,
  loadMergedRedirects,
  renderEdgeRedirects,
  renderRedirectEvidence,
} from "./src/lib/redirects.ts";

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
  const entries = await loadMergedRedirects();
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
      docsRevision: docsRevision.revision,
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

export default defineConfig({
  site: "https://bitty.run",
  output: "static",
  outDir: "./dist",
  redirects: { ...BASE_REDIRECTS },
  markdown: {
    processor: satteri({
      mdastPlugins: [
        docsHeadingsMdastPlugin(),
        docsLinksMdastPlugin({ mirrorRoot }),
      ],
    }),
  },
  integrations: [redirectArtifacts(), docsAssets()],
});
