/**
 * Heading-guard fixtures (`./docsHeadings.ts`).
 *
 * Content headings shift exactly one level so the page template keeps the
 * only `h1`; text, order, and anchor identity are preserved by construction
 * (depth is the sole mutation). Invalid depths fail closed. The title-drop
 * hook removes a leading heading that repeats the entry title (website#74)
 * and keeps any heading whose text differs (website#96 fixture).
 */

import { describe, expect, test } from "bun:test";

import {
  demoteHeadingDepth,
  docsHeadingsMdastPlugin,
  entryTitleFromData,
  isDuplicateTitleHeading,
  normalizeHeadingText,
  type DocsHeadingContext,
  type DocsHeadingHookContext,
  type DocsHeadingNode,
  type DocsHeadingRoot,
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

describe("normalizeHeadingText", () => {
  test("collapses whitespace so wrapped titles compare equal", () => {
    expect(normalizeHeadingText("  ADR 0006 -\n  os.getenv  ")).toBe(
      "ADR 0006 - os.getenv",
    );
  });
});

describe("isDuplicateTitleHeading", () => {
  test("matches the entry title after whitespace normalization", () => {
    const title = "ADR 0006 - os.getenv Exposure and Bitty Module Policy";
    expect(isDuplicateTitleHeading(title, title)).toBe(true);
    expect(isDuplicateTitleHeading(` ${title} `, title)).toBe(true);
    expect(
      isDuplicateTitleHeading("Lua  Runtime  RFC", "Lua Runtime RFC"),
    ).toBe(true);
  });

  test("never matches a different heading or an empty string", () => {
    const title = "ADR 0006 - os.getenv Exposure and Bitty Module Policy";
    expect(isDuplicateTitleHeading("Status", title)).toBe(false);
    expect(isDuplicateTitleHeading(title, "ADR 0005 - Lua Pins")).toBe(false);
    expect(isDuplicateTitleHeading("", title)).toBe(false);
    expect(isDuplicateTitleHeading(title, "  ")).toBe(false);
  });
});

describe("entryTitleFromData", () => {
  test("reads the seeded frontmatter title", () => {
    expect(
      entryTitleFromData({
        astro: { frontmatter: { title: " Decision register " } },
      }),
    ).toBe("Decision register");
  });

  test("returns null for missing or unusable data", () => {
    for (const data of [
      undefined,
      null,
      {},
      { astro: null },
      { astro: {} },
      { astro: { frontmatter: {} } },
      { astro: { frontmatter: { title: 42 } } },
      { astro: { frontmatter: { title: "   " } } },
    ]) {
      expect(entryTitleFromData(data)).toBeNull();
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

describe("title-drop hook", () => {
  function runHook(options: {
    title: unknown;
    children: readonly DocsHeadingNode[];
    texts: ReadonlyMap<DocsHeadingNode, string>;
  }): { removed: object[] } {
    const removed: object[] = [];
    const ctx: DocsHeadingHookContext = {
      data: { astro: { frontmatter: { title: options.title } } },
      removeNode(node): void {
        removed.push(node);
      },
      textContent(node): string {
        return options.texts.get(node as DocsHeadingNode) ?? "";
      },
    };
    const root: DocsHeadingRoot = {
      type: "root",
      children: options.children,
    };
    docsHeadingsMdastPlugin().before(root, ctx);
    return { removed };
  }

  test("drops a leading heading that repeats the entry title", () => {
    const title = "ADR 0006 - os.getenv Exposure and Bitty Module Policy";
    const heading: DocsHeadingNode = { type: "heading", depth: 1 };
    const paragraph: DocsHeadingNode = { type: "paragraph" };
    const { removed } = runHook({
      title,
      children: [heading, paragraph],
      texts: new Map([[heading, title]]),
    });
    expect(removed).toEqual([heading]);
  });

  test("keeps a first heading whose text differs from the title", () => {
    const heading: DocsHeadingNode = { type: "heading", depth: 2 };
    const paragraph: DocsHeadingNode = { type: "paragraph" };
    const { removed } = runHook({
      title: "Lua Runtime RFC",
      children: [heading, paragraph],
      texts: new Map([[heading, "Overview"]]),
    });
    expect(removed).toEqual([]);
  });

  test("ignores documents without a usable title or without headings", () => {
    const heading: DocsHeadingNode = { type: "heading", depth: 1 };
    const paragraph: DocsHeadingNode = { type: "paragraph" };
    expect(
      runHook({
        title: undefined,
        children: [heading, paragraph],
        texts: new Map([[heading, "Overview"]]),
      }).removed,
    ).toEqual([]);
    expect(
      runHook({
        title: "Lua Runtime RFC",
        children: [paragraph],
        texts: new Map(),
      }).removed,
    ).toEqual([]);
  });
});
