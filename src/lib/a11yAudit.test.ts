/**
 * Accessibility-audit asset-policy and full-sweep fixtures.
 *
 * The rejection fixtures include every relevant element, every URL-bearing
 * attribute, mixed CDN/local srcset candidates, and a nested page discovered
 * only by a recursive sweep. They make both permission branches and the
 * formerly sampled, late-page branch fail closed.
 */

import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  BUNDLED_VECTOR_EXTENSIONS,
  RASTER_EXTENSIONS,
  auditDocsShell,
  classifyAssetReference,
  collectRenderedPages,
  findBrokenInternalLinks,
  findDisallowedAssetReferences,
  normalizedText,
  pageAriaCurrentCount,
  repeatsPageTitle,
  sidebarListDepth,
} from "./a11yAudit.ts";

const MIXED_CDN_LOCAL_SRCSET = [
  '<img src="https://cdn.bitty.run/images/a.webp"',
  '     srcset="https://cdn.bitty.run/images/a.webp 1x, /_astro/local.png 2x">',
].join("\n");

const URL_ATTRIBUTES_BY_ELEMENT = [
  '<img src="/_astro/local.png">',
  '<img data-src="/_astro/local.png">',
  '<picture src="/_astro/local.png"></picture>',
  '<source src="/_astro/local.png">',
  '<video src="/_astro/local.mp4" poster="/_astro/poster.jpg"></video>',
  '<video data-src="/_astro/local.mp4"></video>',
  '<audio src="/_astro/local.mp3"></audio>',
  '<audio data-src="/_astro/local.mp3"></audio>',
  '<canvas data-src="/_astro/local.png"></canvas>',
] as const;

function temporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bitty-a11y-audit-"));
}

describe("a11y asset policy", () => {
  test("rejects mixed CDN/local srcset candidates", () => {
    const problems = findDisallowedAssetReferences(MIXED_CDN_LOCAL_SRCSET);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.value).toBe("/_astro/local.png");
  });

  test("reproduces that the old first-attribute-only logic accepted it", () => {
    const match = /<(img|picture|canvas)\b([^>]*)>/gi;
    let bundledRaster = false;
    for (const element of MIXED_CDN_LOCAL_SRCSET.matchAll(match)) {
      const source =
        /\b(?:src|poster|srcset)\s*=\s*["']([^"']+)/i.exec(
          element[2] ?? "",
        )?.[1] ?? "";
      bundledRaster ||= !/^https?:\/\/cdn\.bitty\.run\//i.test(source.trim());
    }
    expect(bundledRaster).toBe(false);
  });

  test("accepts policy-approved bundled vectors", () => {
    for (const extension of BUNDLED_VECTOR_EXTENSIONS) {
      expect(classifyAssetReference(`/_astro/00-overview${extension}`)).toBe(
        "bundled-vector",
      );
    }
  });

  test("rejects every known bundled raster extension", () => {
    for (const extension of RASTER_EXTENSIONS) {
      expect(
        findDisallowedAssetReferences(`<img src="/_astro/local${extension}">`),
      ).toHaveLength(1);
    }
  });

  test("fails closed for unknown and extensionless asset references", () => {
    expect(
      findDisallowedAssetReferences('<img src="/_astro/local.xyz">'),
    ).toHaveLength(1);
    expect(
      findDisallowedAssetReferences('<img src="/_astro/local">'),
    ).toHaveLength(1);
  });

  test("accepts data URIs and exact CDN URLs", () => {
    expect(
      findDisallowedAssetReferences('<img src="data:image/png;base64,AAAA">'),
    ).toEqual([]);
    expect(
      findDisallowedAssetReferences(
        '<img src="https://cdn.bitty.run/images/a.png">',
      ),
    ).toEqual([]);
    expect(
      findDisallowedAssetReferences(
        '<img src="https://cdn.bitty.run.evil.example/a.png">',
      ),
    ).toHaveLength(1);
  });

  test("inspects every URL-bearing attribute across every media element", () => {
    for (const html of URL_ATTRIBUTES_BY_ELEMENT) {
      const problems = findDisallowedAssetReferences(html);
      expect(problems.length).toBeGreaterThanOrEqual(1);
      expect(problems.every((problem) => problem.allowed === false)).toBe(true);
    }
  });

  describe("a11y passthrough pages", () => {
    test("marks interactive mirror pages passthrough, template pages not", async () => {
      const root = await temporaryDirectory();
      try {
        await mkdir(
          join(root, "docs", "0.1.0", "architecture", "interactive"),
          {
            recursive: true,
          },
        );
        await mkdir(join(root, "docs", "0.1.0", "guide"), { recursive: true });
        await writeFile(
          join(
            root,
            "docs",
            "0.1.0",
            "architecture",
            "interactive",
            "index.html",
          ),
          '<html lang="en"><body><div class="diagram-app"></div></body></html>',
        );
        await writeFile(
          join(root, "docs", "0.1.0", "guide", "index.html"),
          '<html lang="en"><body></body></html>',
        );

        const pages = await collectRenderedPages(root);
        expect(pages).toHaveLength(2);
        const mirror = pages.find((page) =>
          page.relativePath.includes("architecture/interactive/"),
        );
        const template = pages.find((page) =>
          page.relativePath.includes("/guide/"),
        );
        expect(mirror).toBeDefined();
        expect(mirror?.passthrough).toBe(true);
        expect(template).toBeDefined();
        expect(template?.passthrough).toBe(false);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });

    test("reports media element names instead of a bare bracket", () => {
      const problems = findDisallowedAssetReferences(
        '<picture><source srcset="/_astro/local.png 1x"></picture>',
      );
      expect(problems).toHaveLength(1);
      expect(problems[0]?.element).toBe("<source");
    });
  });
  test("finds a late nested raster reference and accepts a local SVG", async () => {
    const root = await temporaryDirectory();
    try {
      await mkdir(join(root, "a", "b", "c", "d", "e", "f"), {
        recursive: true,
      });
      await writeFile(join(root, "index.html"), "<!doctype html><h1>Home</h1>");
      await writeFile(
        join(root, "a", "vector.html"),
        '<img src="/_astro/late.svg">',
      );
      await writeFile(
        join(root, "a", "b", "c", "d", "e", "f", "late.html"),
        '<img src="/_astro/late.png">',
      );
      await writeFile(
        join(root, "a", "redirect.html"),
        '<meta http-equiv="refresh" content="0; url=/target">',
      );

      const pages = await collectRenderedPages(root);
      expect(pages).toHaveLength(4);
      expect(pages.filter((page) => !page.redirectStub)).toHaveLength(3);
      const late = pages.find((page) =>
        page.relativePath.endsWith("/late.html"),
      );
      expect(late).toBeDefined();
      expect(
        findDisallowedAssetReferences('<img src="/_astro/late.png">'),
      ).toHaveLength(1);
      expect(
        findDisallowedAssetReferences('<img src="/_astro/late.svg">'),
      ).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("a11y internal dead links", () => {
  const KNOWN = new Set([
    "docs/latest/index.html",
    "docs/latest/guide/index.html",
  ]);

  test("flags only the dead relative doc link", () => {
    const html = [
      '<a href="./guide/">live relative</a>',
      '<a href="./findings/readme/">dead relative</a>',
      '<a href="./guide/?q=x#frag">live with query and hash</a>',
      '<a href="/docs/latest/guide/">live absolute</a>',
      '<a href="https://example.com/docs/latest/x/">external</a>',
      '<a href="#anchor">anchor only</a>',
      '<a href="/">site root</a>',
      '<a href="./CHANGELOG.md">repo file reference</a>',
      '<a href="../assets/diagram.css">asset file reference</a>',
    ].join("\n");
    const broken = findBrokenInternalLinks(
      html,
      "docs/latest/index.html",
      KNOWN,
    );
    expect(broken).toHaveLength(1);
    expect(broken[0]).toEqual({
      href: "./findings/readme/",
      resolved: "docs/latest/findings/readme/index.html",
    });
  });

  test("resolves parent-relative links against the holding page", () => {
    const html = '<a href="../guide/">up one level</a>';
    const broken = findBrokenInternalLinks(
      html,
      "docs/latest/nested/index.html",
      KNOWN,
    );
    expect(broken).toEqual([]);
  });
});

describe("a11y docs shell audit", () => {
  const SHELL = [
    "<h1>ADR 0006 - os.getenv Exposure and Bitty Module Policy</h1>",
    '<nav class="docs-breadcrumb" aria-label="Breadcrumb"><ol><li>Concepts</li></ol></nav>',
    '<nav class="docs-sidebar" aria-label="Documentation">',
    "<ul>",
    '<li class="docs-nav-group"><details class="docs-nav-group-details" open><summary>Concepts</summary><ul>',
    '<li class="docs-nav-entry"><a href="/docs/latest/decisions/adrs/adr-0006-os-env-policy/" aria-current="page">os.getenv Exposure and Bitty Module Policy</a></li>',
    "</ul></details></li>",
    "</ul>",
    "</nav>",
    '<article class="prose"><h2 id="status">Status</h2><p>Accepted.</p></article>',
  ].join("\n");

  test("accepts a compliant docs shell", () => {
    expect(auditDocsShell(SHELL)).toEqual([]);
    expect(sidebarListDepth(SHELL)).toBe(2);
    expect(pageAriaCurrentCount(SHELL)).toBe(1);
    expect(repeatsPageTitle(SHELL)).toBe(false);
  });

  test("flags an article body that repeats the page title", () => {
    const echoed = SHELL.replace(
      '<h2 id="status">Status</h2>',
      "<h2>ADR 0006 - os.getenv Exposure and Bitty Module Policy</h2>",
    );
    expect(repeatsPageTitle(echoed)).toBe(true);
    expect(auditDocsShell(echoed).map((defect) => defect.kind)).toContain(
      "title-echo",
    );
  });

  test("flags a second page-wide aria-current and a third list level", () => {
    const doubled = SHELL.replace(
      '<a href="/docs/latest/decisions/adrs/adr-0006-os-env-policy/" aria-current="page">',
      '<a href="/docs/latest/" aria-current="page">Docs</a><a href="/docs/latest/decisions/adrs/adr-0006-os-env-policy/" aria-current="page">',
    );
    // A third list level nested inside the second one, which is the shape the
    // two-layer ceiling forbids.
    const nested = doubled.replace(
      "</a></li>",
      '</a><ul><li class="docs-nav-entry"><a href="/docs/latest/decisions/">nested</a></li></ul></li>',
    );
    const kinds = auditDocsShell(nested).map((defect) => defect.kind);
    expect(kinds).toContain("aria-current");
    expect(sidebarListDepth(nested)).toBe(3);
    expect(kinds).toContain("sidebar-depth");
  });

  test("flags a missing breadcrumb landmark", () => {
    const bare = SHELL.replace(
      'aria-label="Breadcrumb"',
      'aria-label="Sections"',
    );
    expect(auditDocsShell(bare).map((defect) => defect.kind)).toContain(
      "breadcrumb",
    );
  });

  // Invariant for the comparison text (CTX-0050): the tag removal runs to a
  // fixed point, because CodeQL's js/incomplete-multi-character-sanitization
  // (high) fires on the single-pass form and that alert fails the required
  // CodeQL check. This test documents the invariant; it is NOT a guard that
  // fails when the loop is reverted — measured, the single pass and the loop
  // agree on every input tried ({a,<,>} strings up to length 8, and the 422
  // built HTML files), so the CI CodeQL check is what actually pins the loop.
  // A lone `<` with no `>` also survives; the value is only ever compared as
  // text and never inserted into a document.
  test("removes nested angle brackets to a fixed point", () => {
    const nested = "<<script>alert(1)<</script>";
    expect(normalizedText(nested)).toBe("alert(1)");
    expect(normalizedText(nested)).not.toContain("<");
    expect(normalizedText(normalizedText(nested))).toBe(normalizedText(nested));
    expect(normalizedText("<h2>  Status </h2>")).toBe("Status");
  });
});
