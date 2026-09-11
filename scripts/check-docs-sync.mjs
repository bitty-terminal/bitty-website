#!/usr/bin/env bun
/**
 * Website Delivery RFC SY-4 — docs:check (staleness gate)
 *
 * Materializes the pinned bitty-docs revision in an isolated clone, runs the
 * canonical parity gates, and fails closed when the committed mirror or its
 * provenance manifest diverges from that revision. Also rejects a malformed,
 * short, or floating pin. Hand edits inside src/content/docs/ are caught here.
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
  listEligibleSourcePaths,
  materializeSnapshot,
  readPinFile,
  repoPaths,
  runParityGates,
} from "./lib/docs-source.mjs";
import { validateRouteCollisions } from "./lib/docs-routes.mjs";

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
      `missing provenance manifest ${paths.manifestFile}; run \`just docs-sync PIN=<sha>\``,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new SyncError(`malformed provenance manifest: ${error.message}`);
  }
  const keys = Object.keys(parsed).sort().join(",");
  if (keys !== "files,revision,source") {
    throw new SyncError(
      `provenance manifest must have exactly { files, revision, source }; found {${keys}}`,
    );
  }
  return parsed;
}

async function main() {
  const pin = await readPinFile(ROOT);
  const committed = await readCommittedManifest();

  if (committed.source !== pin.source) {
    fail(
      `manifest source "${committed.source}" does not match pin source "${pin.source}"`,
    );
  }

  let snapshot = null;
  try {
    snapshot = await materializeSnapshot({
      root: ROOT,
      pinValue: pin.revision,
      source: pin.source,
    });
    if (snapshot.sha !== pin.revision) {
      fail(
        `pin revision ${pin.revision} resolved to ${snapshot.sha}; re-run \`just docs-sync PIN=${pin.revision}\``,
      );
    }
    runParityGates(snapshot.dir);

    const expectedFiles = docsOnly(await hashTree(snapshot.dir));
    const mirrorFiles = await hashTree(paths.mirrorRoot);
    const eligible = await listEligibleSourcePaths(paths.mirrorRoot);
    validateRouteCollisions(eligible);

    if (committed.revision !== snapshot.sha) {
      fail(
        `manifest revision ${committed.revision} is stale vs pinned ${snapshot.sha}`,
      );
    }

    const manifestDiff = diffHashMaps(expectedFiles, committed.files);
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
        `docs mirror is stale vs pinned ${snapshot.sha} (${problems.join("; ")})`,
        detail,
      );
    }

    console.log(
      `docs mirror current at ${snapshot.sha} (${Object.keys(expectedFiles).length} files, ${eligible.length} publishable, parity green)`,
    );
  } finally {
    if (snapshot) await cleanupSnapshot(snapshot.dir);
  }
}

main().catch((error) => {
  const message =
    error instanceof SyncError
      ? error.message
      : (error?.stack ?? String(error));
  console.error(`error: ${message}`);
  process.exit(1);
});
