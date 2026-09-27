/**
 * Script-level pin-advance CLI regression (#98 review).
 *
 * The wrapper in `scripts/lib/docs-source.mjs` must delegate pin syntax to the
 * schema authority. It once round-tripped a synthetic single-source pin set
 * through `parseDocsPinSet`, so tightening an unrelated pin-set rule (revision
 * index ownership) made it reject every valid revision: `docs-sync --pin`
 * failed with a message about the revision index, the band gate on that path
 * became unreachable, and every unit test stayed green because they covered
 * the pure-string `validatePinFormat`, not this wrapper. These cases exercise
 * the wrapper the CLI actually calls, so a reintroduced round trip fails here.
 */

import { describe, expect, test } from "bun:test";

import {
  assertPinFormat,
  parseSyncArgs,
} from "../../scripts/lib/docs-source.mjs";

const SHA = "9891949ca20b245375ece9a9015d0f42458fd2b1";

describe("docs-sync pin-advance arguments", () => {
  test("accepts a full lowercase sha and an immutable tag", () => {
    expect(() => assertPinFormat(SHA)).not.toThrow();
    expect(() => assertPinFormat("v0.1.0")).not.toThrow();
  });

  test("rejects a floating branch", () => {
    expect(() => assertPinFormat("main")).toThrow(/floating branch/u);
  });

  test("rejects a short or mixed-case sha", () => {
    expect(() => assertPinFormat("abc1234")).toThrow(/short or mixed-case/u);
    expect(() => assertPinFormat(SHA.toUpperCase())).toThrow(
      /short or mixed-case/u,
    );
  });

  test("parses the per-source advance form and the rejected legacy form", () => {
    expect(parseSyncArgs(["--source", "bitty-docs", "--pin", SHA])).toEqual({
      pin: SHA,
      source: "bitty-docs",
    });
    expect(parseSyncArgs(["--pin", SHA])).toEqual({ pin: SHA, source: null });
    expect(() => parseSyncArgs([`PIN=${SHA}`])).toThrow(/unknown argument/u);
  });
});
