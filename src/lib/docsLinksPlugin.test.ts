/**
 * Plugin-adapter fixtures (`./docsLinksPlugin.ts`).
 *
 * The pure rewrite is tested in `docsLinks.test.ts`; here the adapter is
 * pinned: source-path derivation from `fileURL`, skipping documents that can
 * never ship, and leaving external references untouched.
 */

import { describe, expect, test } from "bun:test";

import {
  docsLinksMdastPlugin,
  sourcePathForFileURL,
  type DocsLinkContext,
  type DocsLinkNode,
} from "./docsLinksPlugin.ts";

const MIRROR_ROOT = "/repo/src/content/docs";

function fakeContext(fileURL: URL | undefined) {
  const calls: Array<{ key: string; value: string }> = [];
  const ctx: DocsLinkContext = {
    fileURL,
    setProperty: (_node, key, value) => {
      calls.push({ key, value });
    },
  };
  return { ctx, calls };
}

describe("sourcePathForFileURL", () => {
  test("derives the docs/-relative source path", () => {
    expect(
      sourcePathForFileURL(
        new URL("file:///repo/src/content/docs/docs/decisions/foo.md"),
        MIRROR_ROOT,
      ),
    ).toBe("docs/decisions/foo.md");
  });

  test("rejects documents outside the mirror root", () => {
    expect(() =>
      sourcePathForFileURL(new URL("file:///other/place.md"), MIRROR_ROOT),
    ).toThrow();
    expect(() => sourcePathForFileURL(undefined, MIRROR_ROOT)).toThrow();
  });
});

describe("docsLinksMdastPlugin", () => {
  test("rewrites a relative link in a routable document", () => {
    const plugin = docsLinksMdastPlugin({ mirrorRoot: MIRROR_ROOT });
    const node: DocsLinkNode = {
      type: "link",
      url: "../open-questions.md",
    };
    const { ctx, calls } = fakeContext(
      new URL("file:///repo/src/content/docs/docs/decisions/adrs/x.md"),
    );
    plugin.link(node, ctx);
    expect(calls).toEqual([{ key: "url", value: "../../open-questions/" }]);
  });

  test("skips documents that can never ship", () => {
    const plugin = docsLinksMdastPlugin({ mirrorRoot: MIRROR_ROOT });
    const node: DocsLinkNode = { type: "link", url: "../foo.md" };
    const { ctx, calls } = fakeContext(
      new URL("file:///repo/src/content/docs/docs/sources/notes.md"),
    );
    plugin.link(node, ctx);
    expect(calls).toEqual([]);
  });

  test("leaves external references untouched", () => {
    const plugin = docsLinksMdastPlugin({ mirrorRoot: MIRROR_ROOT });
    const node: DocsLinkNode = {
      type: "definition",
      url: "https://example.com/a.md",
    };
    const { ctx, calls } = fakeContext(
      new URL("file:///repo/src/content/docs/docs/decisions/foo.md"),
    );
    plugin.definition(node, ctx);
    expect(calls).toEqual([]);
  });
});
