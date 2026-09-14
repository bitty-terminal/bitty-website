#!/usr/bin/env bun
/**
 * Website Delivery RFC SY-2 — sync:docs
 *
 *   bun run sync:docs --pin <40-char-sha|immutable-tag>
 *
 * Single pin file: src/content/docs-revision.json { revision, source, synced_at }
 * Provenance manifest: src/content/docs-manifest.json { source, revision, files }
 *
 * The pinned bitty-docs revision is materialized in an isolated temporary
 * clone (never the shared checkout), the canonical parity gates run on that
 * snapshot, and the mirror + manifest are written deterministically. Running
 * the same pin twice is a byte-for-byte no-op.
 */

import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SyncError,
  assertPinFormat,
  cleanupSnapshot,
  deriveSourceFromLocal,
  hashTree,
  listEligibleSourcePaths,
  materializeSnapshot,
  parsePinArg,
  readPinFile,
  repoPaths,
  replaceMirror,
  runParityGates,
  serializeJson,
  writeFileIfChanged,
} from "./lib/docs-source.mjs";
import { validateRouteCollisions } from "../src/lib/docsRoutes.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = repoPaths(ROOT);

async function readExistingPin() {
  if (!existsSync(paths.pinFile)) return null;
  try {
    return await readPinFile(ROOT);
  } catch {
    return null;
  }
}

async function main() {
  const pinValue = parsePinArg(process.argv.slice(2));
  assertPinFormat(pinValue);

  const existingPin = await readExistingPin();
  const source =
    existingPin?.source ??
    process.env.BITTY_DOCS_SOURCE ??
    deriveSourceFromLocal(ROOT);
  if (!source) {
    throw new SyncError(
      "no pin source, no BITTY_DOCS_SOURCE, and no local bitty-docs checkout; set BITTY_DOCS_REMOTE",
    );
  }

  let snapshot = null;
  try {
    console.log(`resolving bitty-docs ${pinValue} ...`);
    snapshot = await materializeSnapshot({ root: ROOT, pinValue, source });
    console.log(`  resolved to ${snapshot.sha}`);
    console.log("  parity gates (metadata, language, links, hygiene) ...");
    runParityGates(snapshot.dir);

    await replaceMirror(snapshot.dir, paths.mirrorRoot);
    const eligible = await listEligibleSourcePaths(paths.mirrorRoot);
    validateRouteCollisions(eligible);

    const files = await hashTree(paths.mirrorRoot);
    const manifest = {
      source: source ?? "unknown",
      revision: snapshot.sha,
      files,
    };
    const manifestChanged = await writeFileIfChanged(
      paths.manifestFile,
      serializeJson(manifest),
    );

    const syncedAt =
      existingPin && existingPin.revision === snapshot.sha
        ? existingPin.synced_at
        : new Date().toISOString();
    const pinChanged = await writeFileIfChanged(
      paths.pinFile,
      serializeJson({
        revision: snapshot.sha,
        source: manifest.source,
        synced_at: syncedAt,
      }),
    );

    const count = Object.keys(files).length;
    console.log(
      `synced bitty-docs ${pinValue} -> ${snapshot.sha} (${count} files, ${eligible.length} publishable)`,
    );
    console.log(
      `  ${relative(ROOT, paths.manifestFile)} ${manifestChanged ? "written" : "unchanged"}`,
    );
    console.log(
      `  ${relative(ROOT, paths.pinFile)} ${pinChanged ? "written" : "unchanged"}`,
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
