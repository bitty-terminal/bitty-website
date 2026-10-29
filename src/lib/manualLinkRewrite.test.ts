import { describe, expect, test } from "bun:test";

import {
  buildManualPathIndex,
  resolveManualHref,
  rewriteManualLinks,
} from "./manualLinkRewrite.ts";
import { loadManualManifest } from "./manualDocs.ts";

const MANIFEST = loadManualManifest();
const INDEX = buildManualPathIndex(MANIFEST);

describe("resolveManualHref", () => {
  test("maps a sibling document to its canonical route", () => {
    expect(
      resolveManualHref("cli.md", "getting-started/quickstart.md", "en", INDEX),
    ).toBe("/docs/getting-started/cli/");
  });

  test("maps a parent-relative document and keeps the fragment", () => {
    expect(
      resolveManualHref(
        "../configuration/themes.md#tokens",
        "plugins/getting-started.md",
        "zh-CN",
        INDEX,
      ),
    ).toBe("/zh-CN/docs/configuration/themes/#tokens");
  });

  test("leaves external, in-page, and asset links untouched", () => {
    for (const href of [
      "https://example.com/x.md",
      "mailto:dev@bitty.run",
      "#local-anchor",
      "",
      "diagram.svg",
      "//cdn.bitty.run/x",
    ]) {
      expect(
        resolveManualHref(href, "getting-started/quickstart.md", "en", INDEX),
      ).toBeNull();
    }
  });

  test("fails closed when the target is not published", () => {
    expect(() =>
      resolveManualHref(
        "missing.md",
        "getting-started/quickstart.md",
        "en",
        INDEX,
      ),
    ).toThrow(/not published/u);
  });
});

describe("rewriteManualLinks", () => {
  test("rewrites prose links but not code fences or inline code", () => {
    const source = [
      "See [CLI](cli.md) and [themes](../configuration/themes.md#tokens).",
      "",
      "```md",
      "See [CLI](cli.md).",
      "```",
      "",
      "Inline example: `[CLI](cli.md)` stays literal.",
    ].join("\n");

    const rewritten = rewriteManualLinks(
      source,
      "getting-started/quickstart.md",
      "en",
      INDEX,
    );

    expect(rewritten).toContain("See [CLI](/docs/getting-started/cli/)");
    expect(rewritten).toContain("[themes](/docs/configuration/themes/#tokens)");
    expect(rewritten).toContain("See [CLI](cli.md).");
    expect(rewritten).toContain("`[CLI](cli.md)` stays literal.");
  });

  test("leaves documents without cross-links unchanged", () => {
    const source = "# Title\n\nNo links here.\n";
    expect(
      rewriteManualLinks(source, "faq/troubleshooting.md", "en", INDEX),
    ).toBe(source);
  });
});
