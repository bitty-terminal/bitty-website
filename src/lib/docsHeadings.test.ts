/**
 * Heading-demotion fixtures (`./docsHeadings.ts`).
 *
 * Content headings shift exactly one level so the page template keeps the
 * only `h1`; text, order, and anchor identity are preserved by construction
 * (depth is the sole mutation). Invalid depths fail closed.
 */

import { describe, expect, test } from "bun:test";

import {
  demoteHeadingDepth,
  docsHeadingsMdastPlugin,
  type DocsHeadingContext,
  type DocsHeadingNode,
} from "./docsHeadings.ts";

describe("demoteHeadingDepth", () => {
  test("shifts every level down by one, clamping h6", () => {
    expect([
      demoteHeadingDepth(1),
      demoteHeadingDepth(2),
      demoteHeadingDepth(3),
      demoteHeadingDepth(4),
      demoteHeadingDepth(5),
      demoteHeadingDepth(6),
    ]).toEqual([2, 3, 4, 5, 6, 6]);
  });

  test("rejects non-heading depths", () => {
    for (const depth of [0, 7, -1, Number.NaN, 1.5]) {
      expect(() => demoteHeadingDepth(depth)).toThrow();
    }
  });
});

describe("docsHeadingsMdastPlugin", () => {
  function run(depth: unknown): { calls: Array<[object, string, unknown]> } {
    const calls: Array<[object, string, unknown]> = [];
    const ctx: DocsHeadingContext = {
      setProperty(node, key, value): void {
        calls.push([node, key, value]);
      },
    };
    const node = { type: "heading", depth } as DocsHeadingNode;
    docsHeadingsMdastPlugin().heading(node, ctx);
    return { calls };
  }

  test("demotes h1 to h2 via setProperty", () => {
    const { calls } = run(1);
    expect(calls.length).toBe(1);
    expect(calls[0]?.[1]).toBe("depth");
    expect(calls[0]?.[2]).toBe(2);
  });

  test("leaves nodes without a numeric depth untouched", () => {
    expect(run(undefined).calls).toEqual([]);
  });

  test("is named for the satteri registry", () => {
    expect(docsHeadingsMdastPlugin().name).toBe("bitty-docs-headings");
  });
});
