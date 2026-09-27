/**
 * Provenance artifact contracts (bitty-website#98, task T9).
 *
 * Both directions are asserted on purpose: the build emits the artifact
 * `./docsProvenance.ts` derives, and `scripts/validate-dist.mjs` re-derives it
 * from the pins and the committed manifest and rejects any disagreement. These
 * tests prove the derivation is complete, the aggregate is the sum over
 * sources, and every mutation the deployed gate must catch actually fails.
 */

import { describe, expect, test } from "bun:test";

import {
  DOCS_PROVENANCE_SCHEMA,
  assertDocsProvenanceMatches,
  assertVersionsCorpusSet,
  buildDocsProvenance,
  corpusSetId,
  parseDocsProvenance,
} from "./docsProvenance.ts";
import { parseDocsManifest, parseDocsPinSet } from "./docsPins.ts";

const REV_A = "5c3c97d1b989a02c68f298aa3cbe74b953dcff6a";
const REV_B = "29188785d88485898d6d86fd0632124adea126dd";
const REV_C = "dcb7b84069b5b67d72d238dd646cc446d1ece384";
const REV_D = "d60262cce06b97e70a04b77760c9621d05e5b3d5";

const GENERATED_AT = "2026-09-28T12:00:00.000Z";

function pinsFixture() {
  return parseDocsPinSet({
    schema: 2,
    sources: [
      {
        id: "bitty-docs",
        source: "github.com/bitty-terminal/bitty-docs",
        revision: REV_B,
        synced_at: "2026-09-27T21:55:39.043Z",
        mounts: [{ from: "docs", to: "" }],
        published: { min: 3, max: 3 },
      },
      {
        id: "bitty-terminal-docs",
        source: "github.com/bitty-terminal/bitty-terminal-docs",
        revision: REV_D,
        synced_at: "2026-09-27T18:48:53.000Z",
        mounts: [{ from: ".", to: "projects/bitty" }],
        published: { min: 18, max: 18 },
      },
    ],
  });
}

function counts(overrides: Partial<Record<string, number>> = {}) {
  return {
    files: 10,
    pages: 8,
    published: 2,
    demoted: 3,
    withheld: 1,
    excluded: 4,
    ...overrides,
  };
}

function manifestFixture() {
  return parseDocsManifest({
    schema: 2,
    sources: [
      {
        id: "bitty-docs",
        source: "github.com/bitty-terminal/bitty-docs",
        revision: REV_B,
        mounts: [{ from: "docs", to: "" }],
        parity: {
          metadata: "pass",
          language: "pass",
          links: "pass",
          hygiene: "pass",
        },
        counts: counts({
          published: 3,
          demoted: 44,
          withheld: 0,
          excluded: 52,
        }),
        files: {},
        published_routes: ["/docs/roadmap/", "/docs/", "/docs/releases/"],
      },
      {
        id: "bitty-terminal-docs",
        source: "github.com/bitty-terminal/bitty-terminal-docs",
        revision: REV_D,
        mounts: [{ from: ".", to: "projects/bitty" }],
        parity: {
          metadata: "pass",
          language: "pass",
          links: "pass",
          hygiene: "pass",
        },
        counts: counts({
          published: 18,
          demoted: 17,
          withheld: 14,
          excluded: 63,
        }),
        files: {},
        published_routes: ["/docs/projects/bitty/product/vision/"],
      },
    ],
  });
}

describe("corpusSetId", () => {
  test("is derived from the pinned id@revision set, order-independent", () => {
    const pins = pinsFixture();
    const reversed = parseDocsPinSet({
      schema: 2,
      sources: [...pins.sources].reverse(),
    });
    expect(corpusSetId(reversed)).toBe(corpusSetId(pins));
    expect(corpusSetId(pins)).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  test("changes when one source revision changes", () => {
    const before = corpusSetId(pinsFixture());
    const after = corpusSetId(
      parseDocsPinSet({
        schema: 2,
        sources: [
          { ...pinsFixture().sources[0], revision: REV_A },
          pinsFixture().sources[1],
        ],
      }),
    );
    expect(after).not.toBe(before);
  });

  test("changes when a source is dropped", () => {
    const before = corpusSetId(pinsFixture());
    const after = corpusSetId(
      parseDocsPinSet({ schema: 2, sources: [pinsFixture().sources[0]] }),
    );
    expect(after).not.toBe(before);
  });
});

describe("buildDocsProvenance", () => {
  test("carries every source's slug, revision, mounts, counts and routes", () => {
    const artifact = buildDocsProvenance(
      pinsFixture(),
      manifestFixture(),
      GENERATED_AT,
    );
    expect(artifact.schema).toBe(DOCS_PROVENANCE_SCHEMA);
    expect(artifact.sources.map((source) => source.id)).toEqual([
      "bitty-docs",
      "bitty-terminal-docs",
    ]);
    const docs = artifact.sources[0];
    expect(docs?.slug).toBe("github.com/bitty-terminal/bitty-docs");
    expect(docs?.revision).toBe(REV_B);
    expect(docs?.mounts).toEqual([{ from: "docs", to: "" }]);
    expect(docs?.counts).toEqual({
      files: 10,
      pages: 8,
      published: 3,
      demoted: 44,
      withheld: 0,
      excluded: 52,
    });
    expect(docs?.routes).toEqual([
      "/docs/",
      "/docs/releases/",
      "/docs/roadmap/",
    ]);
    expect(artifact.corpus_set).toEqual({
      id: corpusSetId(pinsFixture()),
      source_count: 2,
    });
  });

  test("aggregates the totals as the sum over sources", () => {
    const artifact = buildDocsProvenance(
      pinsFixture(),
      manifestFixture(),
      GENERATED_AT,
    );
    expect(artifact.aggregate.sources).toBe(2);
    expect(artifact.aggregate.published).toBe(3 + 18);
    expect(artifact.aggregate.demoted).toBe(44 + 17);
    expect(artifact.aggregate.withheld).toBe(0 + 14);
    expect(artifact.aggregate.excluded).toBe(52 + 63);
    expect(artifact.aggregate.files).toBe(10 + 10);
  });

  test("fails closed when the manifest has no entry for a pinned source", () => {
    const manifest = parseDocsManifest({
      schema: 2,
      sources: [manifestFixture().sources[0]],
    });
    expect(() =>
      buildDocsProvenance(pinsFixture(), manifest, GENERATED_AT),
    ).toThrow(/no entry for pinned source "bitty-terminal-docs"/u);
  });

  test("fails closed when the manifest revision drifts from the pin", () => {
    const manifest = parseDocsManifest({
      schema: 2,
      sources: [
        { ...manifestFixture().sources[0], revision: REV_A },
        manifestFixture().sources[1],
      ],
    });
    expect(() =>
      buildDocsProvenance(pinsFixture(), manifest, GENERATED_AT),
    ).toThrow(/revision .* for "bitty-docs" does not match the pin/u);
  });
});

describe("assertDocsProvenanceMatches", () => {
  const build = () =>
    JSON.parse(
      JSON.stringify(
        buildDocsProvenance(pinsFixture(), manifestFixture(), GENERATED_AT),
      ),
    );

  test("accepts the artifact it derives", () => {
    const artifact = assertDocsProvenanceMatches(
      build(),
      pinsFixture(),
      manifestFixture(),
    );
    expect(artifact.sources).toHaveLength(2);
  });

  test("rejects a changed source revision in exactly one place", () => {
    const artifact = build();
    artifact.sources[0].revision = REV_C;
    expect(() =>
      assertDocsProvenanceMatches(artifact, pinsFixture(), manifestFixture()),
    ).toThrow(
      /source "bitty-docs" revision must be 29188785d88485898d6d86fd0632124adea126dd, received dcb7b84069b5b67d72d238dd646cc446d1ece384/u,
    );
  });

  test("rejects a dropped source", () => {
    const artifact = build();
    artifact.sources = artifact.sources.filter(
      (source: { id: string }) => source.id !== "bitty-terminal-docs",
    );
    expect(() =>
      assertDocsProvenanceMatches(artifact, pinsFixture(), manifestFixture()),
    ).toThrow(/is missing the pinned source "bitty-terminal-docs"/u);
  });

  test("rejects an extra unknown source", () => {
    const artifact = build();
    artifact.sources.push({ ...artifact.sources[0], id: "bitty-ai-docs" });
    expect(() =>
      assertDocsProvenanceMatches(artifact, pinsFixture(), manifestFixture()),
    ).toThrow(/lists unknown source "bitty-ai-docs"/u);
  });

  test("rejects a broken per-source count", () => {
    const artifact = build();
    artifact.sources[1].counts.published = 19;
    expect(() =>
      assertDocsProvenanceMatches(artifact, pinsFixture(), manifestFixture()),
    ).toThrow(/source "bitty-terminal-docs" counts must be/u);
  });

  test("rejects a broken aggregate", () => {
    const artifact = build();
    artifact.aggregate.demoted = 60;
    expect(() =>
      assertDocsProvenanceMatches(artifact, pinsFixture(), manifestFixture()),
    ).toThrow(/aggregate must be/u);
  });

  test("rejects a corpus-set identity that does not derive from the pins", () => {
    const artifact = build();
    artifact.corpus_set.id = `sha256:${"0".repeat(64)}`;
    expect(() =>
      assertDocsProvenanceMatches(artifact, pinsFixture(), manifestFixture()),
    ).toThrow(/corpus_set.id must be sha256:/u);
  });
});

describe("parseDocsProvenance", () => {
  test("rejects an unknown top-level key and a bad schema", () => {
    const artifact = JSON.parse(
      JSON.stringify(
        buildDocsProvenance(pinsFixture(), manifestFixture(), GENERATED_AT),
      ),
    );
    expect(() => parseDocsProvenance({ ...artifact, extra: true })).toThrow(
      /unknown key "extra"/u,
    );
    expect(() => parseDocsProvenance({ ...artifact, schema: 99 })).toThrow(
      /schema must be 1/u,
    );
  });
});

describe("assertVersionsCorpusSet", () => {
  test("accepts the derived set and rejects a stale version record", () => {
    const pins = pinsFixture();
    const current = corpusSetId(pins);
    expect(() =>
      assertVersionsCorpusSet(
        [{ version: "0.1.0", docs_corpus: current }],
        pins,
      ),
    ).not.toThrow();
    expect(() =>
      assertVersionsCorpusSet(
        [{ version: "0.1.0", docs_corpus: `sha256:${"1".repeat(64)}` }],
        pins,
      ),
    ).toThrow(/version "0.1.0" records docs_corpus/u);
  });
});
