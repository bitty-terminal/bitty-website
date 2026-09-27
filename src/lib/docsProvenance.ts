/**
 * Deployed provenance evidence (bitty-website#98, task T9).
 *
 * The build emits `dist/docs-provenance.json` — the artifact a deploy can be
 * audited against. For every consumed source it records the slug, the pinned
 * revision, the mount targets, the per-kind counts and the routes the source
 * published, plus the aggregate totals and the corpus-set identity the build
 * used.
 *
 * Every value is derived from the same authority the build already reads: the
 * pins (`./docsPins.ts` over `src/content/docs-revision.json`) and the
 * committed provenance manifest (`src/content/docs-manifest.json`). Nothing is
 * re-literal here, so the artifact cannot claim provenance the pins do not
 * carry; a source dropped from the pin set disappears from the artifact, and a
 * changed revision changes both the entry and the corpus-set identity.
 *
 * This module is the single place the artifact shape and the derivation live.
 * `astro.config.mjs` builds from it, `scripts/validate-dist.mjs` re-derives
 * from the pins + manifest and compares the deployed artifact against the
 * result, and `src/lib/docsProvenance.test.ts` pins both directions.
 */

import { createHash } from "node:crypto";

import {
  DocsPinsError,
  type DocsManifest,
  type DocsPinSet,
  type DocsSourceCounts,
} from "./docsPins.ts";

/** Schema revision of `dist/docs-provenance.json`. */
export const DOCS_PROVENANCE_SCHEMA = 1;

/** Basename of the provenance artifact inside the built output. */
export const DOCS_PROVENANCE_FILENAME = "docs-provenance.json";

/** Repository-relative path of the artifact (also used in messages). */
export const DOCS_PROVENANCE_FILE = `dist/${DOCS_PROVENANCE_FILENAME}`;

/** Algorithm prefix of {@link corpusSetId}; the id is `<prefix><64-hex>`. */
export const DOCS_CORPUS_ID_PREFIX = "sha256:";

/**
 * Stable identity of the pinned source set: `sha256:<64-hex>` over the sorted
 * `id@revision` lines of every consumed source.
 *
 * It is derived, never literal: advancing any pin — or adding/removing a
 * source — changes the id, so a deployed artifact cannot describe one corpus
 * set while the build consumed another. A single string is honest here because
 * it names the *set*; the per-source revisions live beside it in this artifact
 * and in `docs_revisions` of `dist/redirects.json`.
 */
export function corpusSetId(pins: DocsPinSet): string {
  const canonical = [...pins.sources]
    .map((source) => `${source.id}@${source.revision}`)
    .sort()
    .join("\n");
  return `${DOCS_CORPUS_ID_PREFIX}${createHash("sha256").update(canonical).digest("hex")}`;
}

/** Per-source counts the artifact carries (the manifest's count shape). */
export type DocsProvenanceCounts = DocsSourceCounts;

/** One consumed source as the artifact declares it. */
export type DocsProvenanceSource = {
  readonly id: string;
  readonly slug: string;
  readonly revision: string;
  readonly mounts: readonly { readonly from: string; readonly to: string }[];
  readonly counts: DocsProvenanceCounts;
  readonly routes: readonly string[];
};

/** The parsed `dist/docs-provenance.json`. */
export type DocsProvenance = {
  readonly schema: typeof DOCS_PROVENANCE_SCHEMA;
  readonly generated_at: string;
  readonly corpus_set: {
    readonly id: string;
    readonly source_count: number;
  };
  readonly aggregate: DocsProvenanceCounts & { readonly sources: number };
  readonly sources: readonly DocsProvenanceSource[];
};

const COUNT_KEYS = [
  "files",
  "pages",
  "published",
  "demoted",
  "withheld",
  "excluded",
] as const;

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DocsPinsError(`${what} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function assertKnownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  what: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      throw new DocsPinsError(`${what} has unknown key "${key}"`);
    }
  }
}

function parseCounts(value: unknown, what: string): DocsProvenanceCounts {
  const record = asRecord(value, what);
  assertKnownKeys(record, COUNT_KEYS, what);
  const counts: Record<string, number> = {};
  for (const key of COUNT_KEYS) {
    const entry = record[key];
    if (!Number.isInteger(entry) || (entry as number) < 0) {
      throw new DocsPinsError(`${what}.${key} must be a non-negative integer`);
    }
    counts[key] = entry as number;
  }
  return counts as unknown as DocsProvenanceCounts;
}

function sumCounts(
  counts: readonly DocsProvenanceCounts[],
): DocsProvenanceCounts {
  const total: Record<string, number> = {};
  for (const key of COUNT_KEYS) {
    total[key] = counts.reduce((sum, entry) => sum + entry[key], 0);
  }
  return total as unknown as DocsProvenanceCounts;
}

function manifestById(manifest: DocsManifest) {
  const byId = new Map(manifest.sources.map((entry) => [entry.id, entry]));
  for (const source of manifest.sources) {
    if (byId.get(source.id) !== source) {
      throw new DocsPinsError(
        `src/content/docs-manifest.json has duplicate source id "${source.id}"`,
      );
    }
  }
  return byId;
}

/**
 * Build the provenance artifact from the pins and the committed manifest.
 *
 * @throws {@link DocsPinsError} when the manifest has no entry for a pinned
 *   source (or records a different revision/source), because then the evidence
 *   would describe a corpus set the build did not consume.
 */
export function buildDocsProvenance(
  pins: DocsPinSet,
  manifest: DocsManifest,
  generatedAt: string,
): DocsProvenance {
  if (Number.isNaN(Date.parse(generatedAt))) {
    throw new DocsPinsError(
      `docs provenance generated_at must be ISO-8601: ${JSON.stringify(generatedAt)}`,
    );
  }
  const byId = manifestById(manifest);
  const sources = [...pins.sources]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((pin): DocsProvenanceSource => {
      const entry = byId.get(pin.id);
      if (entry === undefined) {
        throw new DocsPinsError(
          `src/content/docs-manifest.json has no entry for pinned source "${pin.id}"; run \`just docs-sync\``,
        );
      }
      if (entry.source !== pin.source) {
        throw new DocsPinsError(
          `src/content/docs-manifest.json source "${entry.source}" for "${pin.id}" does not match the pin "${pin.source}"`,
        );
      }
      if (entry.revision !== pin.revision) {
        throw new DocsPinsError(
          `src/content/docs-manifest.json revision ${entry.revision} for "${pin.id}" does not match the pin ${pin.revision}`,
        );
      }
      return {
        id: pin.id,
        slug: pin.source,
        revision: pin.revision,
        mounts: pin.mounts.map((mount) => ({
          from: mount.from,
          to: mount.to,
        })),
        counts: { ...entry.counts },
        routes: [...entry.published_routes].sort(),
      };
    });
  return {
    schema: DOCS_PROVENANCE_SCHEMA,
    generated_at: generatedAt,
    corpus_set: { id: corpusSetId(pins), source_count: sources.length },
    aggregate: {
      sources: sources.length,
      ...sumCounts(sources.map((s) => s.counts)),
    },
    sources,
  };
}

/** Strict parse of the artifact's committed shape. */
export function parseDocsProvenance(raw: unknown): DocsProvenance {
  const record = asRecord(raw, DOCS_PROVENANCE_FILE);
  assertKnownKeys(
    record,
    ["schema", "generated_at", "corpus_set", "aggregate", "sources"],
    DOCS_PROVENANCE_FILE,
  );
  if (record.schema !== DOCS_PROVENANCE_SCHEMA) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} schema must be ${DOCS_PROVENANCE_SCHEMA}; found ${JSON.stringify(record.schema)}`,
    );
  }
  if (
    typeof record.generated_at !== "string" ||
    Number.isNaN(Date.parse(record.generated_at))
  ) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} generated_at must be ISO-8601: ${JSON.stringify(record.generated_at)}`,
    );
  }
  const corpusSet = asRecord(
    record.corpus_set,
    `${DOCS_PROVENANCE_FILE} corpus_set`,
  );
  assertKnownKeys(
    corpusSet,
    ["id", "source_count"],
    `${DOCS_PROVENANCE_FILE} corpus_set`,
  );
  if (typeof corpusSet.id !== "string" || corpusSet.id.length === 0) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} corpus_set.id must be a non-empty string`,
    );
  }
  if (!Number.isInteger(corpusSet.source_count)) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} corpus_set.source_count must be an integer`,
    );
  }
  const aggregateRecord = asRecord(
    record.aggregate,
    `${DOCS_PROVENANCE_FILE} aggregate`,
  );
  assertKnownKeys(
    aggregateRecord,
    ["sources", ...COUNT_KEYS],
    `${DOCS_PROVENANCE_FILE} aggregate`,
  );
  if (!Number.isInteger(aggregateRecord.sources)) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} aggregate.sources must be an integer`,
    );
  }
  const aggregate = {
    sources: aggregateRecord.sources as number,
    ...parseCounts(
      Object.fromEntries(COUNT_KEYS.map((key) => [key, aggregateRecord[key]])),
      `${DOCS_PROVENANCE_FILE} aggregate`,
    ),
  };
  if (!Array.isArray(record.sources) || record.sources.length === 0) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} sources must be a non-empty array`,
    );
  }
  const sources = record.sources.map((value, index): DocsProvenanceSource => {
    const what = `${DOCS_PROVENANCE_FILE} sources[${index}]`;
    const source = asRecord(value, what);
    assertKnownKeys(
      source,
      ["id", "slug", "revision", "mounts", "counts", "routes"],
      what,
    );
    for (const key of ["id", "slug", "revision"] as const) {
      if (
        typeof source[key] !== "string" ||
        (source[key] as string).length === 0
      ) {
        throw new DocsPinsError(`${what}.${key} must be a non-empty string`);
      }
    }
    if (!Array.isArray(source.mounts) || source.mounts.length === 0) {
      throw new DocsPinsError(`${what}.mounts must be a non-empty array`);
    }
    const mounts = source.mounts.map((mount, mountIndex) => {
      const mountRecord = asRecord(mount, `${what}.mounts[${mountIndex}]`);
      assertKnownKeys(
        mountRecord,
        ["from", "to"],
        `${what}.mounts[${mountIndex}]`,
      );
      if (
        typeof mountRecord.from !== "string" ||
        typeof mountRecord.to !== "string"
      ) {
        throw new DocsPinsError(
          `${what}.mounts[${mountIndex}] must carry string from/to`,
        );
      }
      return { from: mountRecord.from, to: mountRecord.to };
    });
    if (!Array.isArray(source.routes)) {
      throw new DocsPinsError(`${what}.routes must be an array`);
    }
    const routes = source.routes.map((route, routeIndex) => {
      if (typeof route !== "string") {
        throw new DocsPinsError(
          `${what}.routes[${routeIndex}] must be a string`,
        );
      }
      return route;
    });
    return {
      id: source.id as string,
      slug: source.slug as string,
      revision: source.revision as string,
      mounts,
      counts: parseCounts(source.counts, `${what}.counts`),
      routes,
    };
  });
  return {
    schema: DOCS_PROVENANCE_SCHEMA,
    generated_at: record.generated_at as string,
    corpus_set: {
      id: corpusSet.id as string,
      source_count: corpusSet.source_count as number,
    },
    aggregate,
    sources,
  };
}

function countsEqual(
  left: DocsProvenanceCounts,
  right: DocsProvenanceCounts,
): boolean {
  return COUNT_KEYS.every((key) => left[key] === right[key]);
}

function describeCounts(
  counts: DocsProvenanceCounts & { sources?: number },
): string {
  return JSON.stringify(counts);
}

/**
 * Fail closed when the deployed artifact disagrees with the pins and the
 * committed manifest: re-derives the expected artifact from the same authority
 * and compares every source, count and route.
 *
 * @throws {@link DocsPinsError} naming the first disagreement.
 */
export function assertDocsProvenanceMatches(
  raw: unknown,
  pins: DocsPinSet,
  manifest: DocsManifest,
): DocsProvenance {
  const artifact = parseDocsProvenance(raw);
  const expectedId = corpusSetId(pins);
  if (artifact.corpus_set.id !== expectedId) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} corpus_set.id must be ${expectedId} (derived from the pinned source set), received ${artifact.corpus_set.id}`,
    );
  }
  if (artifact.corpus_set.source_count !== pins.sources.length) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} corpus_set.source_count must be ${pins.sources.length}, received ${artifact.corpus_set.source_count}`,
    );
  }
  const expected = buildDocsProvenance(pins, manifest, artifact.generated_at);
  const byId = new Map(artifact.sources.map((source) => [source.id, source]));
  for (const want of expected.sources) {
    const got = byId.get(want.id);
    if (got === undefined) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} is missing the pinned source "${want.id}"; it lists ${artifact.sources.map((source) => source.id).join(", ") || "(none)"}`,
      );
    }
    if (got.revision !== want.revision) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} source "${want.id}" revision must be ${want.revision}, received ${got.revision}`,
      );
    }
    if (got.slug !== want.slug) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} source "${want.id}" slug must be ${want.slug}, received ${got.slug}`,
      );
    }
    if (JSON.stringify(got.mounts) !== JSON.stringify(want.mounts)) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} source "${want.id}" mounts must be ${JSON.stringify(want.mounts)}, received ${JSON.stringify(got.mounts)}`,
      );
    }
    if (!countsEqual(got.counts, want.counts)) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} source "${want.id}" counts must be ${describeCounts(want.counts)}, received ${describeCounts(got.counts)} (per src/content/docs-manifest.json)`,
      );
    }
    if (JSON.stringify(got.routes) !== JSON.stringify(want.routes)) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} source "${want.id}" routes must match the manifest's published_routes (${want.routes.length} route(s))`,
      );
    }
  }
  const expectedIds = new Set(expected.sources.map((source) => source.id));
  for (const source of artifact.sources) {
    if (!expectedIds.has(source.id)) {
      throw new DocsPinsError(
        `${DOCS_PROVENANCE_FILE} lists unknown source "${source.id}"; expected exactly the pinned source(s) ${[...expectedIds].join(", ")}`,
      );
    }
  }
  if (
    artifact.aggregate.sources !== expected.aggregate.sources ||
    !countsEqual(artifact.aggregate, expected.aggregate)
  ) {
    throw new DocsPinsError(
      `${DOCS_PROVENANCE_FILE} aggregate must be ${describeCounts(expected.aggregate)} (sum over the pinned sources), received ${describeCounts(artifact.aggregate)}`,
    );
  }
  return artifact;
}

/**
 * Fail closed when a hosted version record does not name the pinned corpus
 * set (`src/content/versions.json`).
 *
 * The site hosts one aggregate mirror for every version segment, so each
 * version's `docs_corpus` is the identity of the set the build consumed. A pin
 * advance changes the derived id, and the version record must move with it —
 * which is the point: the deployed version evidence cannot keep claiming an
 * older corpus set.
 */
export function assertVersionsCorpusSet(
  entries: readonly {
    readonly version: string;
    readonly docs_corpus: string;
  }[],
  pins: DocsPinSet,
): void {
  const expected = corpusSetId(pins);
  for (const entry of entries) {
    if (entry.docs_corpus !== expected) {
      throw new DocsPinsError(
        `src/content/versions.json version "${entry.version}" records docs_corpus ${JSON.stringify(entry.docs_corpus)}, but the pinned source set derives ${expected}; update the version record with the pin set`,
      );
    }
  }
}
