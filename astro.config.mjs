import { defineConfig } from "astro/config";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import docsRevision from "./src/content/docs-revision.json" with { type: "json" };
import versions from "./src/content/versions.json" with { type: "json" };
import {
  BASE_REDIRECTS,
  buildExpandedRedirectTable,
  loadMergedRedirects,
  renderEdgeRedirects,
  renderRedirectEvidence,
} from "./src/lib/redirects.ts";

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

export default defineConfig({
  site: "https://bitty.run",
  output: "static",
  outDir: "./dist",
  redirects: { ...BASE_REDIRECTS },
  integrations: [redirectArtifacts()],
});
