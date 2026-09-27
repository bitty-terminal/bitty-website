#!/usr/bin/env bun
/**
 * Website Delivery RFC SY-2 — sync:docs (bitty-website#98, schema 2)
 *
 *   bun run sync:docs                       # re-materialize every source at
 *                                           # its committed pin (no-op when
 *                                           # the mirror already matches)
 *   bun run sync:docs --source <id> --pin <40-char-sha|immutable-tag>
 *
 * Pin file (schema 2): src/content/docs-revision.json — one entry per source,
 * each with its mounts into the aggregate mirror and its published band.
 * Manifest (schema 2): src/content/docs-manifest.json — per-source parity
 * results, counts, per-file SHA-256, and the routes the source publishes.
 *
 * Every source is materialized in its own isolated temporary clone (never a
 * shared checkout), the canonical parity gates run on that snapshot, and the
 * mirror + manifest are written deterministically. Running the same pins twice
 * is a byte-for-byte no-op.
 */

import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SyncError,
  assertPinFormat,
  cleanupSnapshot,
  hashTree,
  isLegacyPin,
  materializeSnapshot,
  migrateLegacyPin,
  parseSyncArgs,
  parityReport,
  readRawPinFile,
  repoPaths,
  replaceMirror,
  runParityGatesDetailed,
  serializeJson,
  writeFileIfChanged,
} from "./lib/docs-source.mjs";
import {
  DOCS_MANIFEST_SCHEMA,
  DOCS_PIN_SCHEMA,
  parseDocsPinSet,
} from "../src/lib/docsPins.ts";
import { validateRouteCollisions } from "../src/lib/docsRoutes.ts";
import { loadPublicationCorpus } from "../src/lib/publicationCorpus.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = repoPaths(ROOT);

/**
 * T1 migrates the single bitty-docs pin; the per-source materialization for N
 * sources lands with the next step of #98. Fail closed rather than silently
 * materializing only the last source.
 */
function assertSingleSource(pins) {
  if (pins.sources.length !== 1) {
    throw new SyncError(
      `sync:docs currently pins one source; found ${pins.sources.length} in ${paths.pinFile}`,
    );
  }
}

async function loadCommittedPins() {
  const raw = await readRawPinFile(ROOT);
  if (raw === null) {
    throw new SyncError(
      `missing pin file ${relative(ROOT, paths.pinFile)} (SY-1)`,
    );
  }
  if (isLegacyPin(raw)) {
    console.log(
      "migrating the legacy flat pin to schema 2 (bitty-website#98) ...",
    );
    return { pins: migrateLegacyPin(raw, { min: 0, max: 0 }), migrated: true };
  }
  return { pins: parseDocsPinSet(raw), migrated: false };
}

function countsOf(corpus) {
  return {
    published: corpus.report.published.length,
    demoted: corpus.report.demoted.length,
    excluded: corpus.report.excluded.length,
  };
}

async function main() {
  const { pin: pinValue, source: sourceId } = parseSyncArgs(
    process.argv.slice(2),
  );
  const { pins, migrated } = await loadCommittedPins();
  assertSingleSource(pins);
  const pin = pins.sources[0];

  if (sourceId !== null && sourceId !== pin.id) {
    throw new SyncError(
      `--source "${sourceId}" is not a pinned source (pinned: ${pin.id})`,
    );
  }
  const targetRevision = pinValue ?? pin.revision;
  if (pinValue !== null) {
    // Validate the advance against the shared pin rules before resolving it.
    assertPinFormat(pinValue);
  }

  let snapshot = null;
  try {
    console.log(`resolving ${pin.id} ${targetRevision} ...`);
    snapshot = await materializeSnapshot({
      root: ROOT,
      pinValue: targetRevision,
      source: pin.source,
      id: pin.id,
    });
    console.log(`  resolved to ${snapshot.sha}`);
    console.log("  parity gates (metadata, language, links, hygiene) ...");
    const parity = runParityGatesDetailed(snapshot.dir);
    const failedParity = Object.entries(parity.results).filter(
      ([, result]) => result !== "pass",
    );
    if (failedParity.length > 0) {
      throw new SyncError(
        `${pin.id}: parity gate(s) failed: ${failedParity.map(([mode]) => mode).join(", ")}`,
      );
    }

    await replaceMirror(snapshot.dir, paths.mirrorRoot);
    // Eligibility comes from the publication policy, not from this script:
    // the count below is the set the build publishes (website#97).
    const corpus = await loadPublicationCorpus(paths.mirrorRoot);
    validateRouteCollisions(corpus.publishedSources);
    const counts = countsOf(corpus);

    const files = await hashTree(paths.mirrorRoot);
    const pages = Object.keys(files).filter((key) =>
      key.endsWith(".md"),
    ).length;
    const publishedBand = migrated
      ? { min: counts.published, max: counts.published }
      : pin.published;

    const manifest = {
      schema: DOCS_MANIFEST_SCHEMA,
      sources: [
        {
          id: pin.id,
          source: pin.source,
          revision: snapshot.sha,
          mounts: pin.mounts,
          parity: parityReport(parity),
          counts: {
            files: Object.keys(files).length,
            pages,
            published: counts.published,
            demoted: counts.demoted,
            withheld: 0,
            excluded: counts.excluded,
          },
          files,
          published_routes: [...corpus.publishedRoutes].sort(),
        },
      ],
    };
    const manifestChanged = await writeFileIfChanged(
      paths.manifestFile,
      serializeJson(manifest),
    );

    const syncedAt =
      !migrated && pin.revision === snapshot.sha
        ? pin.synced_at
        : new Date().toISOString();
    const pinChanged = await writeFileIfChanged(
      paths.pinFile,
      serializeJson({
        schema: DOCS_PIN_SCHEMA,
        sources: [
          {
            id: pin.id,
            source: pin.source,
            revision: snapshot.sha,
            synced_at: syncedAt,
            mounts: pin.mounts,
            published: publishedBand,
            ...(pin.include === undefined ? {} : { include: pin.include }),
            ...(pin.exclude === undefined ? {} : { exclude: pin.exclude }),
          },
        ],
      }),
    );

    console.log(
      `synced ${pin.id} ${targetRevision} -> ${snapshot.sha} (${manifest.sources[0].counts.files} files, ${counts.published} publishable, ${corpus.redirects.length} excluded page(s) redirect)`,
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
      : (error?.message ?? error?.stack ?? String(error));
  console.error(`error: ${message}`);
  process.exit(1);
});
