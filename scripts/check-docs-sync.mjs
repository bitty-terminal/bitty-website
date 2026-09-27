#!/usr/bin/env bun
/**
 * Website Delivery RFC SY-4 — docs:check (staleness gate, bitty-website#98)
 *
 * Materializes each pinned source revision in an isolated clone, runs the
 * canonical parity gates, and fails closed when the committed mirror or its
 * provenance manifest diverges from any pin. Also rejects a malformed, short,
 * or floating pin and the pre-#98 flat pin shape. Hand edits inside
 * src/content/docs/ are caught here.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SyncError,
  cleanupSnapshot,
  diffHashMaps,
  docsOnly,
  hashTree,
  materializeSnapshot,
  readPinFile,
  repoPaths,
  runParityGatesDetailed,
} from "./lib/docs-source.mjs";
import {
  assertPublishedUnderMounts,
  parseDocsManifest,
} from "../src/lib/docsPins.ts";
import { validateRouteCollisions } from "../src/lib/docsRoutes.ts";
import { loadPublicationCorpus } from "../src/lib/publicationCorpus.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = repoPaths(ROOT);

function fail(message, details = []) {
  console.error(`error: ${message}`);
  for (const line of details) console.error(`  - ${line}`);
  process.exit(1);
}

async function readCommittedManifest() {
  let raw;
  try {
    raw = await readFile(paths.manifestFile, "utf8");
  } catch {
    throw new SyncError(
      `missing provenance manifest ${paths.manifestFile}; run \`just docs-sync\``,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SyncError(`malformed provenance manifest: ${error.message}`);
  }
  return parseDocsManifest(parsed);
}

async function main() {
  const pins = await readPinFile(ROOT);
  const manifest = await readCommittedManifest();

  if (pins.sources.length !== 1) {
    fail(
      `${paths.pinFile} pins ${pins.sources.length} source(s); the per-source gate loop for N sources lands with the next step of bitty-website#98`,
    );
  }
  const pin = pins.sources[0];
  const entry = manifest.sources[0];
  if (entry.id !== pin.id) {
    fail(`manifest source "${entry.id}" does not match pin source "${pin.id}"`);
  }

  let snapshot = null;
  try {
    snapshot = await materializeSnapshot({
      root: ROOT,
      pinValue: pin.revision,
      source: pin.source,
      id: pin.id,
    });
    if (snapshot.sha !== pin.revision) {
      fail(
        `pin revision ${pin.revision} resolved to ${snapshot.sha}; re-run \`just docs-sync\``,
      );
    }
    const parity = runParityGatesDetailed(snapshot.dir);
    const failedParity = Object.entries(parity.results).filter(
      ([, result]) => result !== "pass",
    );
    if (failedParity.length > 0) {
      fail(
        `${pin.id}: parity gate(s) failed: ${failedParity.map(([mode]) => mode).join(", ")}`,
      );
    }

    // The publication policy is the gate's first fail-closed check: the
    // mirror must only publish reader-facing pages, and the count below is
    // exactly the set the build publishes (website#97, closing website#102
    // D2/D6). Runs on the committed mirror, before the staleness report, so a
    // governance page on the site is never masked by mirror diff noise.
    const corpus = await loadPublicationCorpus(paths.mirrorRoot);
    validateRouteCollisions(corpus.publishedSources);
    // #98 §3.2: a published page must lie under a declared mount.
    assertPublishedUnderMounts(corpus.publishedSources, pins);

    const expectedFiles = docsOnly(await hashTree(snapshot.dir));
    const mirrorFiles = await hashTree(paths.mirrorRoot);

    if (entry.revision !== snapshot.sha) {
      fail(
        `manifest revision ${entry.revision} is stale vs pinned ${snapshot.sha}`,
      );
    }

    const manifestDiff = diffHashMaps(expectedFiles, entry.files);
    const mirrorDiff = diffHashMaps(expectedFiles, mirrorFiles);
    const problems = [];
    if (manifestDiff.missing.length)
      problems.push(`manifest missing ${manifestDiff.missing.length} file(s)`);
    if (manifestDiff.extra.length)
      problems.push(
        `manifest lists ${manifestDiff.extra.length} unknown file(s)`,
      );
    if (manifestDiff.changed.length)
      problems.push(
        `manifest hash mismatch for ${manifestDiff.changed.length} file(s)`,
      );
    if (mirrorDiff.missing.length)
      problems.push(`mirror missing ${mirrorDiff.missing.length} file(s)`);
    if (mirrorDiff.extra.length)
      problems.push(
        `mirror has ${mirrorDiff.extra.length} file(s) not at the pin`,
      );
    if (mirrorDiff.changed.length)
      problems.push(
        `mirror content differs from the pin for ${mirrorDiff.changed.length} file(s)`,
      );

    if (problems.length > 0) {
      const detail = [];
      for (const key of manifestDiff.missing.slice(0, 10))
        detail.push(`manifest missing: ${key}`);
      for (const key of manifestDiff.extra.slice(0, 10))
        detail.push(`manifest unknown: ${key}`);
      for (const key of manifestDiff.changed.slice(0, 10))
        detail.push(`manifest hash differs: ${key}`);
      for (const key of mirrorDiff.missing.slice(0, 10))
        detail.push(`mirror missing: ${key}`);
      for (const key of mirrorDiff.extra.slice(0, 10))
        detail.push(`mirror extra (hand-added?): ${key}`);
      for (const key of mirrorDiff.changed.slice(0, 10))
        detail.push(`mirror edited (hand-edit?): ${key}`);
      fail(
        `${pin.id}: docs mirror is stale vs pinned ${snapshot.sha} (${problems.join("; ")})`,
        detail,
      );
    }

    console.log(
      `docs mirror current at ${snapshot.sha} (${Object.keys(expectedFiles).length} files, ${corpus.report.published.length} publishable, ${corpus.redirects.length} excluded page(s) redirect, parity green)`,
    );
    console.log(
      `  ${pin.id}: ${entry.counts.published} published, ${entry.counts.demoted} demoted, ${entry.counts.withheld} withheld (mounts ${pin.mounts.map((mount) => `${mount.from || "."}->${mount.to || "/"}`).join(", ")})`,
    );
  } finally {
    if (snapshot) await cleanupSnapshot(snapshot.dir);
  }
}

main().catch((error) => {
  const message =
    error instanceof SyncError
      ? error.message
      : (error?.message ?? error?.stack ?? String(error));
  console.error(`error: ${message}`);
  process.exit(1);
});
