#!/usr/bin/env bun
/**
 * Website Delivery RFC SY-2 — sync:docs (bitty-website#98, schema 2)
 *
 *   bun run sync:docs                       # re-materialize every source at
 *                                           # its committed pin (no-op when
 *                                           # the mirror already matches)
 *   bun run sync:docs --source <id> --pin <40-char-sha|immutable-tag>
 *                                           # advance one source; `--pin`
 *                                           # requires `--source` when more
 *                                           # than one source is pinned
 *
 * Pin file (schema 2): src/content/docs-revision.json — one entry per source,
 * each with its mounts into the aggregate mirror and its published band.
 * Manifest (schema 2): src/content/docs-manifest.json — per-source parity
 * results, counts, per-file SHA-256, and the routes the source publishes.
 *
 * Each source is materialized in its own isolated temporary clone (never a
 * shared checkout), the canonical parity gates run on that snapshot, the
 * consumed files are staged through the pin's mounts, and only after the
 * aggregate mirror is assembled and validated is anything written. Running the
 * same pins twice is a byte-for-byte no-op.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SyncError,
  assertPinFormat,
  cleanupSnapshot,
  collectConsumedFiles,
  hashMapOf,
  materializeSnapshot,
  migrateLegacyPin,
  nowIso,
  parseSyncArgs,
  parityReport,
  readRawManifest,
  readRawPinFile,
  repoPaths,
  replaceMirror,
  runParityGatesDetailed,
  serializeJson,
  stageMirror,
  writeFileIfChanged,
} from "./lib/docs-source.mjs";
import {
  DOCS_MANIFEST_SCHEMA,
  DOCS_PIN_SCHEMA,
  assertNoDuplicateMirrorPaths,
  assertNoSourceFailures,
  assertPublishedUnderMounts,
  assertSourcePublishedBand,
  isLegacyPin,
  mountForMirrorPath,
  parseDocsManifest,
  parseDocsPinSet,
} from "../src/lib/docsPins.ts";
import { assertNoPublishedRouteLossBySource } from "../src/lib/docsAggregation.ts";
import { loadMergedRedirects } from "../src/lib/redirects.ts";
import {
  sourcePathToRouteIdentity,
  validateRouteCollisions,
} from "../src/lib/docsRoutes.ts";
import { loadPublicationCorpus } from "../src/lib/publicationCorpus.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = repoPaths(ROOT);

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
    // Re-validate the migration through the schema authority before use: the
    // hand-built shape must satisfy the same parser as every other pin read.
    // The migration has no reviewed band yet (it establishes the observed one),
    // so the band gate below skips this run.
    return {
      pins: parseDocsPinSet(migrateLegacyPin(raw, { min: 0, max: 0 })),
      migrated: true,
    };
  }
  return { pins: parseDocsPinSet(raw), migrated: false };
}

function countBy(entries) {
  const counts = new Map();
  for (const entry of entries) counts.set(entry, (counts.get(entry) ?? 0) + 1);
  return counts;
}

async function main() {
  const { pin: pinValue, source: sourceId } = parseSyncArgs(
    process.argv.slice(2),
  );
  const { pins, migrated } = await loadCommittedPins();

  if (sourceId !== null && !pins.sources.some((pin) => pin.id === sourceId)) {
    throw new SyncError(
      `--source "${sourceId}" is not a pinned source (pinned: ${pins.sources
        .map((pin) => pin.id)
        .join(", ")})`,
    );
  }
  if (pinValue !== null && sourceId === null && pins.sources.length > 1) {
    throw new SyncError(
      "--pin requires --source when more than one source is pinned",
    );
  }
  if (pinValue !== null) assertPinFormat(pinValue);

  const snapshots = [];
  let staging = null;
  try {
    const staged = [];
    for (const pin of pins.sources) {
      const advancing =
        pinValue !== null && (sourceId === null || sourceId === pin.id);
      const targetRevision = advancing ? pinValue : pin.revision;
      console.log(`resolving ${pin.id} ${targetRevision} ...`);
      const snapshot = await materializeSnapshot({
        root: ROOT,
        pinValue: targetRevision,
        source: pin.source,
        id: pin.id,
      });
      snapshots.push(snapshot);
      console.log(`  ${pin.id} resolved to ${snapshot.sha}`);
      const parity = runParityGatesDetailed(snapshot.dir);
      const failed = Object.entries(parity.results).filter(
        ([, result]) => result !== "pass",
      );
      if (failed.length > 0) {
        throw new SyncError(
          `${pin.id}: parity gate(s) failed: ${failed
            .map(([mode]) => mode)
            .join(", ")}`,
        );
      }
      const files = await collectConsumedFiles(snapshot.dir, pin);
      if (files.length === 0) {
        throw new SyncError(
          `${pin.id}: the declared mount(s) consumed no files`,
        );
      }
      staged.push({ pin, sha: snapshot.sha, parity, files });
    }

    // Merge: no two sources may claim one mirror path.
    assertNoDuplicateMirrorPaths(
      staged.flatMap((source) =>
        source.files.map((file) => ({
          mirrorPath: file.mirrorPath,
          id: source.pin.id,
        })),
      ),
    );

    staging = await mkdtemp(join(tmpdir(), "bitty-docs-staging-"));
    await stageMirror(
      staging,
      staged.flatMap((source) => source.files),
    );

    // Eligibility comes from the publication policy, not from this script:
    // the counts below are the set the build publishes (website#97).
    const corpus = await loadPublicationCorpus(staging);
    validateRouteCollisions(corpus.publishedSources);
    assertPublishedUnderMounts(corpus.publishedSources, pins);

    const ownerOf = (mirrorPath) => {
      const owner = mountForMirrorPath(mirrorPath, pins);
      if (owner === null) {
        throw new SyncError(
          `mirror path "${mirrorPath}" is outside every mount`,
        );
      }
      return owner.id;
    };
    const publishedRoutesBySource = new Map();
    for (const sourcePath of corpus.publishedSources) {
      const id = ownerOf(sourcePath);
      const routes = publishedRoutesBySource.get(id) ?? [];
      routes.push(sourcePathToRouteIdentity(sourcePath).routeWithoutVersion);
      publishedRoutesBySource.set(id, routes);
    }
    const demotedBySource = countBy(
      corpus.report.demoted.map((meta) => ownerOf(meta.sourcePath)),
    );
    const withheldBySource = countBy(
      corpus.report.withheld.map((meta) => ownerOf(meta.sourcePath)),
    );
    const excludedBySource = countBy(
      corpus.report.excluded.map((meta) => ownerOf(meta.sourcePath)),
    );

    const manifestSources = staged
      .map((source) => {
        const routes = [
          ...(publishedRoutesBySource.get(source.pin.id) ?? []),
        ].sort();
        return {
          id: source.pin.id,
          source: source.pin.source,
          revision: source.sha,
          mounts: source.pin.mounts,
          parity: parityReport(source.parity),
          counts: {
            files: source.files.length,
            pages: source.files.filter((file) =>
              file.mirrorPath.endsWith(".md"),
            ).length,
            published: routes.length,
            demoted: demotedBySource.get(source.pin.id) ?? 0,
            withheld: withheldBySource.get(source.pin.id) ?? 0,
            excluded: excludedBySource.get(source.pin.id) ?? 0,
          },
          files: hashMapOf(source.files),
          published_routes: routes,
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    const pinSources = staged
      .map((source) => {
        const observed = {
          min: (publishedRoutesBySource.get(source.pin.id) ?? []).length,
          max: (publishedRoutesBySource.get(source.pin.id) ?? []).length,
        };
        return {
          id: source.pin.id,
          source: source.pin.source,
          revision: source.sha,
          synced_at:
            source.pin.revision === source.sha
              ? source.pin.synced_at
              : nowIso(),
          mounts: source.pin.mounts,
          published: migrated ? observed : source.pin.published,
          ...(source.pin.include === undefined
            ? {}
            : { include: source.pin.include }),
          ...(source.pin.exclude === undefined
            ? {}
            : { exclude: source.pin.exclude }),
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    // #98 §3.3 / T4: the published-route regression gate runs BEFORE anything
    // is written. The committed manifest is the baseline; every route it
    // published that no source publishes any more must be covered by a
    // redirect to a published target, and the gate compares route identities,
    // not counts. The comparison is over the AGGREGATE published set (T5):
    // onboarding a corpus re-homes routes between sources while keeping the
    // URL, so a per-source comparison would report those as lost.
    const redirectEntries = await loadMergedRedirects(ROOT);
    const previousRaw = await readRawManifest(ROOT);
    const previousBySource = new Map();
    if (previousRaw !== null && previousRaw.schema === DOCS_MANIFEST_SCHEMA) {
      for (const entry of parseDocsManifest(previousRaw).sources) {
        previousBySource.set(entry.id, entry.published_routes);
      }
    }
    try {
      assertNoPublishedRouteLossBySource(
        previousBySource,
        manifestSources.map((source) => source.published_routes),
        redirectEntries,
      );
    } catch (error) {
      assertNoSourceFailures([
        { source: "<route-loss>", message: error.message },
      ]);
    }

    // #98 §3.4, same gate as `docs:check`, same helper and message: the sync
    // path must refuse to write a pin whose observed publish count left the
    // reviewed band, instead of leaving the failure to the next docs-check.
    // A migration run has no reviewed band yet (it records the observed one),
    // so only committed schema-2 pins are gated; every failing source is
    // collected, and nothing has been written at this point.
    if (!migrated) {
      const bandFailures = [];
      for (const source of staged) {
        const routes = [
          ...(publishedRoutesBySource.get(source.pin.id) ?? []),
        ].sort();
        const previousRoutes = previousBySource.get(source.pin.id) ?? [];
        const added = routes.filter((route) => !previousRoutes.includes(route));
        const removed = previousRoutes.filter(
          (route) => !routes.includes(route),
        );
        try {
          assertSourcePublishedBand(source.pin, routes.length, {
            added,
            removed,
          });
        } catch (error) {
          bandFailures.push({ source: source.pin.id, message: error.message });
        }
      }
      assertNoSourceFailures(bandFailures);
    }

    await replaceMirror(staging, paths.mirrorRoot);
    const manifestChanged = await writeFileIfChanged(
      paths.manifestFile,
      serializeJson({ schema: DOCS_MANIFEST_SCHEMA, sources: manifestSources }),
    );
    const pinChanged = await writeFileIfChanged(
      paths.pinFile,
      serializeJson({ schema: DOCS_PIN_SCHEMA, sources: pinSources }),
    );

    for (const source of manifestSources) {
      console.log(
        `synced ${source.id} -> ${source.revision} (${source.counts.files} files, ${source.counts.pages} pages, ${source.counts.published} publishable)`,
      );
    }
    console.log(
      `  total: ${manifestSources.reduce((sum, source) => sum + source.counts.files, 0)} files, ${corpus.report.published.length} publishable, ${corpus.redirects.length} excluded page(s) redirect`,
    );
    console.log(
      `  ${relative(ROOT, paths.manifestFile)} ${manifestChanged ? "written" : "unchanged"}`,
    );
    console.log(
      `  ${relative(ROOT, paths.pinFile)} ${pinChanged ? "written" : "unchanged"}`,
    );
  } finally {
    for (const snapshot of snapshots) await cleanupSnapshot(snapshot.dir);
    if (staging) await rm(staging, { recursive: true, force: true });
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
