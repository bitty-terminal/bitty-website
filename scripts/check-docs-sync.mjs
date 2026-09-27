#!/usr/bin/env bun
/**
 * Website Delivery RFC SY-4 — docs:check (staleness gate, bitty-website#98)
 *
 * Materializes each pinned source revision in its own isolated clone, runs the
 * canonical parity gates, and fails closed when the committed mirror or its
 * provenance manifest diverges from any pin. Also rejects a malformed, short,
 * or floating pin, the pre-#98 flat pin shape, mount overlap, a mirror file
 * outside every mount, and a source whose published count leaves its reviewed
 * band. Hand edits inside src/content/docs/ are caught here.
 *
 * Every failing source is collected and reported together, so a reviewer who
 * fixes one source cannot believe the rest of the corpora are clean.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SyncError,
  cleanupSnapshot,
  collectConsumedFiles,
  diffHashMaps,
  hashMapOf,
  hashTree,
  materializeSnapshot,
  readPinFile,
  repoPaths,
  runParityGatesDetailed,
} from "./lib/docs-source.mjs";
import {
  assertNoSourceFailures,
  assertPublishedUnderMounts,
  assertSourcePublishedBand,
  mirrorPathsOutsideMounts,
  parseDocsManifest,
  sourceIdForMirrorPath,
} from "../src/lib/docsPins.ts";
import {
  sourcePathToRouteIdentity,
  validateRouteCollisions,
} from "../src/lib/docsRoutes.ts";
import { loadPublicationCorpus } from "../src/lib/publicationCorpus.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = repoPaths(ROOT);

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

/** Byte-for-byte comparison of one source against the mirror and manifest. */
function assertFileParity({ pin, entry, expected, mirrorSlice }) {
  const manifestDiff = diffHashMaps(expected, entry.files);
  const mirrorDiff = diffHashMaps(expected, mirrorSlice);
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
  if (problems.length === 0) return;
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
  throw new SyncError(
    `docs mirror is stale vs pinned ${pin.revision} (${problems.join("; ")})\n    ${detail.join("\n    ")}`,
  );
}

async function main() {
  const pins = await readPinFile(ROOT);
  const manifest = await readCommittedManifest();
  const entryById = new Map(manifest.sources.map((entry) => [entry.id, entry]));
  const failures = [];

  // The publication policy is the gate's first fail-closed check: the mirror
  // must only publish reader-facing pages, and the published count in the
  // summary is exactly the set the build publishes (website#97).
  let corpus = null;
  try {
    corpus = await loadPublicationCorpus(paths.mirrorRoot);
    validateRouteCollisions(corpus.publishedSources);
    // #98 §3.2: a published page must lie under a declared mount.
    assertPublishedUnderMounts(corpus.publishedSources, pins);
  } catch (error) {
    failures.push({ source: "<policy>", message: error.message });
  }

  const mirrorFiles = await hashTree(paths.mirrorRoot);
  // #98 §3.1.5: no mirror file may exist outside every declared mount.
  const outsideMounts = mirrorPathsOutsideMounts(
    Object.keys(mirrorFiles),
    pins,
  );
  if (outsideMounts.length > 0) {
    failures.push({
      source: "<mirror>",
      message: `${outsideMounts.length} file(s) outside every declared mount (hand-added?): ${outsideMounts.slice(0, 10).join(", ")}`,
    });
  }

  const publishedRoutesBySource = new Map();
  if (corpus !== null) {
    for (const sourcePath of corpus.publishedSources) {
      const id = sourceIdForMirrorPath(sourcePath, pins);
      if (id === null) continue;
      const routes = publishedRoutesBySource.get(id) ?? [];
      routes.push(sourcePathToRouteIdentity(sourcePath).routeWithoutVersion);
      publishedRoutesBySource.set(id, routes);
    }
  }

  const snapshots = [];
  try {
    for (const pin of pins.sources) {
      try {
        const entry = entryById.get(pin.id);
        if (entry === undefined) {
          throw new SyncError(
            "provenance manifest has no entry for this source; run `just docs-sync`",
          );
        }
        const snapshot = await materializeSnapshot({
          root: ROOT,
          pinValue: pin.revision,
          source: pin.source,
          id: pin.id,
        });
        snapshots.push(snapshot);
        if (snapshot.sha !== pin.revision) {
          throw new SyncError(
            `pin revision ${pin.revision} resolved to ${snapshot.sha}; re-run \`just docs-sync\``,
          );
        }
        const parity = runParityGatesDetailed(snapshot.dir);
        const failedParity = Object.entries(parity.results).filter(
          ([, result]) => result !== "pass",
        );
        if (failedParity.length > 0) {
          throw new SyncError(
            `parity gate(s) failed: ${failedParity
              .map(([mode]) => mode)
              .join(", ")}`,
          );
        }
        if (entry.revision !== snapshot.sha) {
          throw new SyncError(
            `manifest revision ${entry.revision} is stale vs pinned ${snapshot.sha}`,
          );
        }
        const files = await collectConsumedFiles(snapshot.dir, pin);
        const expected = hashMapOf(files);
        const mirrorSlice = Object.fromEntries(
          Object.entries(mirrorFiles).filter(
            ([mirrorPath]) =>
              sourceIdForMirrorPath(mirrorPath, pins) === pin.id,
          ),
        );
        assertFileParity({ pin, entry, expected, mirrorSlice });

        // #98 §3.4: the source's published count must stay in its reviewed
        // band, with the added/removed routes printed when it moves.
        const routes = [...(publishedRoutesBySource.get(pin.id) ?? [])].sort();
        const manifestRoutes = new Set(entry.published_routes);
        const added = routes.filter((route) => !manifestRoutes.has(route));
        const removed = entry.published_routes.filter(
          (route) => !routes.includes(route),
        );
        assertSourcePublishedBand(pin, routes.length, { added, removed });
      } catch (error) {
        failures.push({ source: pin.id, message: error.message });
      }
    }

    // Collect every failing source and report them together.
    assertNoSourceFailures(failures);

    const label =
      pins.sources.length === 1
        ? pins.sources[0].revision
        : pins.sources.map((pin) => `${pin.id}@${pin.revision}`).join(", ");
    console.log(
      `docs mirror current at ${label} (${Object.keys(mirrorFiles).length} files, ${corpus.report.published.length} publishable, ${corpus.redirects.length} excluded page(s) redirect, parity green)`,
    );
    for (const entry of manifest.sources) {
      console.log(
        `  ${entry.id}: ${entry.counts.published} published, ${entry.counts.demoted} demoted, ${entry.counts.withheld} withheld`,
      );
    }
  } finally {
    for (const snapshot of snapshots) await cleanupSnapshot(snapshot.dir);
  }
}

main().catch((error) => {
  if (error && typeof error.message === "string") {
    console.error(`error: ${error.message}`);
  } else {
    console.error(`error: ${String(error)}`);
  }
  process.exit(1);
});
