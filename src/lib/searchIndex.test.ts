/**
 * CTX-0040 fixtures for the build-time index (`./searchIndex.ts`).
 *
 * Pins the scraping contract against rendered-page shapes: article prose is
 * extracted with scripts/styles dropped and entities decoded, titles come
 * from the first `<h1>`, categories from the docs eyebrow, and slugs from
 * the `dist`-relative `docs/latest/` path. Redirect stubs are skipped, and
 * pages without a title or article text fail closed.
 */

import { describe, expect, test } from "bun:test";

import {
  buildSearchRecords,
  extractArticleText,
  extractCategory,
  extractDescription,
  extractTitle,
  slugFromDistPath,
} from "./searchIndex.ts";

const PAGE = `<!doctype html>
<html lang="en">
<head>
<title>Themes — Bitty latest</title>
<meta name="description" content="Configure &quot;Bitty&quot; color themes &amp; prompts." />
<meta http-equiv="x-test" content="1" />
</head>
<body>
<header><nav>chrome</nav></header>
<main>
<p class="eyebrow">configuration · latest</p>
<h1>Themes</h1>
<article class="prose">
<h2>Setup</h2>
<p>A theme sets <strong>colors</strong> for panels.</p>
<script>console.log("dropped");</script>
<style>.x { color: red; }</style>
</article>
</main>
</body>
</html>`;

describe("extractArticleText", () => {
  test("keeps prose, drops scripts/styles/tags", () => {
    expect(extractArticleText(PAGE)).toBe(
      "Setup A theme sets colors for panels.",
    );
  });

  test("throws without an article element", () => {
    expect(() => extractArticleText("<html><body>none</body></html>")).toThrow(
      /no <article>/u,
    );
  });

  test("decodes each entity once and drops cased script blocks", () => {
    expect(
      extractArticleText(
        '<article class="prose"><p>&amp;lt; stays literal</p><SCRIPT>var dropped = 1;</SCRIPT></article>',
      ),
    ).toBe("&lt; stays literal");
  });
});

describe("extractTitle/extractDescription/extractCategory", () => {
  test("reads the first h1, meta description, and eyebrow", () => {
    expect(extractTitle(PAGE)).toBe("Themes");
    expect(extractDescription(PAGE)).toBe(
      'Configure "Bitty" color themes & prompts.',
    );
    expect(extractCategory(PAGE, "configuration/themes")).toBe("configuration");
  });

  test("falls back to the head slug segment without an eyebrow", () => {
    expect(extractCategory("<html></html>", "security/overview")).toBe(
      "security",
    );
    expect(extractDescription("<html></html>")).toBe("");
    expect(extractTitle("<html></html>")).toBe("");
  });
});

describe("slugFromDistPath", () => {
  test("maps latest pages to canonical slugs", () => {
    expect(slugFromDistPath("docs/latest/index.html")).toBe("");
    expect(
      slugFromDistPath("docs/latest/configuration/themes/index.html"),
    ).toBe("configuration/themes");
  });

  test("rejects other segments and non-index files", () => {
    expect(() => slugFromDistPath("docs/stable/index.html")).toThrow();
    expect(() => slugFromDistPath("docs/latest/themes.html")).toThrow();
  });
});

describe("buildSearchRecords", () => {
  test("indexes canonical pages and sorts by slug", () => {
    const records = buildSearchRecords([
      {
        relativePath: "docs/latest/configuration/themes/index.html",
        html: PAGE,
      },
      {
        relativePath: "docs/latest/index.html",
        html: PAGE.replace("<h1>Themes</h1>", "<h1>Documentation</h1>"),
      },
      {
        relativePath: "docs/latest/old/index.html",
        html: '<html><head><meta http-equiv="refresh" content="0;url=/docs/latest/"/></head><body>Redirecting to <a href="/docs/latest/">here</a></body></html>',
      },
      {
        relativePath: "docs/latest/architecture/interactive/index.html",
        html: '<html><head><title>Hub</title></head><body><div class="diagram-app"><script>var x = 1;</script></div></body></html>',
      },
    ]);
    expect(records.map((record) => record.slug)).toEqual([
      "",
      "configuration/themes",
    ]);
    expect(records[1]?.title).toBe("Themes");
  });

  test("fails closed on title-less or text-less pages", () => {
    expect(() =>
      buildSearchRecords([
        { relativePath: "docs/latest/index.html", html: "<html></html>" },
      ]),
    ).toThrow(/no <h1>/u);
    expect(() =>
      buildSearchRecords([
        {
          relativePath: "docs/latest/index.html",
          html: '<html><body><h1>T</h1><article class="prose"></article></body></html>',
        },
      ]),
    ).toThrow(/no article text/u);
  });
});
