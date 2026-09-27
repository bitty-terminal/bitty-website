/**
 * Schema fixtures for the pin/manifest authority (`./docsPins.ts`,
 * bitty-website#98).
 *
 * Both directions are asserted on purpose: the sync scripts write the schema
 * these tests accept, and the build (`assertValidRevisionPin`) reads the same
 * schema, so a drift between writer and reader must fail here rather than ship
 * a stale pin.
 */

import { describe, expect, test } from "bun:test";

import {
  DOCS_MANIFEST_FILE,
  DOCS_PIN_FILE,
  LEGACY_PIN_MIGRATION_MESSAGE,
  parseDocsManifest,
  parseDocsPinSet,
  validatePinFormat,
} from "./docsPins.ts";

const REVISION = "9891949ca20b245375ece9a9015d0f42458fd2b1";

function validPinSet() {
  return {
    schema: 2,
    sources: [
      {
        id: "bitty-docs",
        source: "github.com/bitty-terminal/bitty-docs",
        revision: REVISION,
        synced_at: "2026-09-13T16:00:51.656Z",
        mounts: [{ from: "docs", to: "" }],
        published: { min: 27, max: 27 },
      },
    ],
  };
}

describe("parseDocsPinSet", () => {
  test("accepts the schema-2 single-source pin", () => {
    const pins = parseDocsPinSet(validPinSet());
    expect(pins.schema).toBe(2);
    expect(pins.sources).toHaveLength(1);
    expect(pins.sources[0]?.id).toBe("bitty-docs");
    expect(pins.sources[0]?.mounts).toEqual([{ from: "docs", to: "" }]);
  });

  test("rejects the legacy flat shape with the migration message", () => {
    expect(() =>
      parseDocsPinSet({
        revision: REVISION,
        source: "github.com/bitty-terminal/bitty-docs",
        synced_at: "2026-09-13T16:00:51.656Z",
      }),
    ).toThrow(LEGACY_PIN_MIGRATION_MESSAGE);
    expect(LEGACY_PIN_MIGRATION_MESSAGE).toContain("just docs-sync");
  });

  test("rejects an unknown schema revision", () => {
    expect(() => parseDocsPinSet({ ...validPinSet(), schema: 1 })).toThrow(
      new RegExp(`${DOCS_PIN_FILE} schema must be 2`, "u"),
    );
  });

  test("rejects an empty source list", () => {
    expect(() => parseDocsPinSet({ schema: 2, sources: [] })).toThrow(
      /sources must be a non-empty array/u,
    );
  });

  test("rejects unknown keys at both levels", () => {
    expect(() => parseDocsPinSet({ ...validPinSet(), extra: true })).toThrow(
      /unknown key "extra"/u,
    );
    const withExtraSourceKey = validPinSet();
    const source = { ...withExtraSourceKey.sources[0], extra: 1 };
    expect(() => parseDocsPinSet({ schema: 2, sources: [source] })).toThrow(
      /unknown key "extra"/u,
    );
  });

  test("rejects duplicate source ids", () => {
    const set = validPinSet();
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [set.sources[0], set.sources[0]],
      }),
    ).toThrow(/duplicate source id "bitty-docs"/u);
  });

  test("rejects a malformed id, source slug, or revision", () => {
    const base = validPinSet();
    const withId = (id: string) =>
      parseDocsPinSet({
        schema: 2,
        sources: [{ ...base.sources[0], id }],
      });
    expect(() => withId("Bitty-Docs")).toThrow(/\.id must match/u);
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [{ ...base.sources[0], source: "not-a-slug" }],
      }),
    ).toThrow(/source is malformed/u);
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [{ ...base.sources[0], revision: "main" }],
      }),
    ).toThrow(/floating branch/u);
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [{ ...base.sources[0], revision: "9891949" }],
      }),
    ).toThrow(/short or mixed-case SHA/u);
  });

  test("rejects a synced_at that is not ISO-8601", () => {
    const base = validPinSet();
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [{ ...base.sources[0], synced_at: "yesterday" }],
      }),
    ).toThrow(/synced_at must be ISO-8601/u);
  });

  test("rejects overlapping mounts and a missing revision-index owner", () => {
    const base = validPinSet();
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [
          { ...base.sources[0], mounts: [{ from: "docs", to: "" }] },
          { ...base.sources[0], id: "other", mounts: [{ from: ".", to: "" }] },
        ],
      }),
    ).toThrow(/mount overlap/u);
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [
          {
            ...base.sources[0],
            mounts: [{ from: ".", to: "projects/bitty" }],
          },
        ],
      }),
    ).toThrow(/no source that owns the revision index/u);
  });

  test("rejects a published band whose min exceeds max", () => {
    const base = validPinSet();
    expect(() =>
      parseDocsPinSet({
        schema: 2,
        sources: [{ ...base.sources[0], published: { min: 5, max: 2 } }],
      }),
    ).toThrow(/must not exceed/u);
  });
});

describe("validatePinFormat", () => {
  test("accepts a full lowercase SHA and an immutable tag", () => {
    expect(validatePinFormat(REVISION)).toBeNull();
    expect(validatePinFormat("v0.1.0")).toBeNull();
  });

  test("reports the problem for a floating branch or short SHA", () => {
    expect(validatePinFormat("main")).toMatch(/floating branch/u);
    expect(validatePinFormat("abc1234")).toMatch(/short or mixed-case/u);
  });
});

describe("parseDocsManifest", () => {
  const validManifest = () => ({
    schema: 2,
    sources: [
      {
        id: "bitty-docs",
        source: "github.com/bitty-terminal/bitty-docs",
        revision: REVISION,
        mounts: [{ from: "docs", to: "" }],
        parity: {
          metadata: "pass",
          language: "pass",
          links: "pass",
          hygiene: "pass",
        },
        counts: {
          files: 153,
          pages: 105,
          published: 27,
          demoted: 52,
          withheld: 0,
          excluded: 26,
        },
        files: { "docs/README.md": "a".repeat(64) },
        published_routes: ["/docs/"],
      },
    ],
  });

  test("accepts a schema-2 manifest", () => {
    const manifest = parseDocsManifest(validManifest());
    expect(manifest.sources[0]?.counts.files).toBe(153);
    expect(manifest.sources[0]?.published_routes).toEqual(["/docs/"]);
  });

  test("rejects the legacy manifest shape", () => {
    expect(() =>
      parseDocsManifest({
        source: "github.com/bitty-terminal/bitty-docs",
        revision: REVISION,
        files: {},
      }),
    ).toThrow(new RegExp(`${DOCS_MANIFEST_FILE} schema must be 2`, "u"));
  });

  test("rejects a non-SHA file hash and a non pass/fail parity result", () => {
    const source = validManifest().sources[0]!;
    expect(() =>
      parseDocsManifest({
        schema: 2,
        sources: [{ ...source, files: { "docs/README.md": "deadbeef" } }],
      }),
    ).toThrow(/must be a lowercase SHA-256/u);
    expect(() =>
      parseDocsManifest({
        schema: 2,
        sources: [{ ...source, parity: { ...source.parity, links: "maybe" } }],
      }),
    ).toThrow(/must be "pass" or "fail"/u);
  });
});
