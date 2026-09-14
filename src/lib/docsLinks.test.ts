/**
 * MV-4 fixtures for version-aware link/asset rewriting (`./docsLinks.ts`).
 *
 * Every rewrite is a relative URL from the linking page's own route, so the
 * same rendered Markdown is correct under any `/docs/<version>/` prefix.
 * Anchors and queries survive verbatim; anything unmappable stays
 * byte-identical (`null`).
 */

import { describe, expect, test } from "bun:test";

import {
  isUntouchableHref,
  resolveDocsTarget,
  rewriteDocsHref,
  splitHref,
} from "./docsLinks.ts";

describe("splitHref", () => {
  test("splits path, query, and fragment", () => {
    expect(splitHref("../foo/bar.md?x=1#frag")).toEqual({
      path: "../foo/bar.md",
      query: "?x=1",
      fragment: "#frag",
    });
    expect(splitHref("a.md")).toEqual({
      path: "a.md",
      query: "",
      fragment: "",
    });
    expect(splitHref("#only")).toEqual({
      path: "",
      query: "",
      fragment: "#only",
    });
  });
});

describe("isUntouchableHref", () => {
  test("leaves external, root-relative, and fragment-only references", () => {
    for (const href of [
      "https://example.com/x.md",
      "http://example.com/",
      "mailto:a@b.c",
      "//example.com/x",
      "/docs/decisions/",
      "#section",
      "",
    ]) {
      expect(isUntouchableHref(href)).toBe(true);
    }
    expect(isUntouchableHref("../foo.md")).toBe(false);
    expect(isUntouchableHref("bar.md")).toBe(false);
  });
});

describe("resolveDocsTarget", () => {
  test("resolves siblings and parents inside docs/", () => {
    expect(
      resolveDocsTarget(
        "docs/decisions/adrs/ADR-0008-headless.md",
        "../open-questions.md",
      ),
    ).toBe("docs/decisions/open-questions.md");
    expect(
      resolveDocsTarget("docs/decisions/adrs/ADR-0008-headless.md", "foo.md"),
    ).toBe("docs/decisions/adrs/foo.md");
  });

  test("returns null past the docs/ root", () => {
    expect(resolveDocsTarget("docs/README.md", "../TODO.md")).toBeNull();
    expect(resolveDocsTarget("docs/README.md", "../README.md")).toBeNull();
  });
});

describe("rewriteDocsHref markdown links", () => {
  const source = "docs/decisions/adrs/ADR-0008-headless.md";

  test("sibling document", () => {
    expect(
      rewriteDocsHref(source, "ADR-0009-plugin-api-v1-lua-surface.md"),
    ).toBe("../adr-0009-plugin-api-v1-lua-surface/");
  });

  test("parent document with anchor and query preserved", () => {
    expect(rewriteDocsHref(source, "../open-questions.md#frag")).toBe(
      "../../open-questions/#frag",
    );
    expect(rewriteDocsHref(source, "../open-questions.md?x=1")).toBe(
      "../../open-questions/?x=1",
    );
  });

  test("category readme keeps its explicit slug", () => {
    expect(rewriteDocsHref("docs/decisions/index.md", "README.md")).toBe(
      "./readme/",
    );
    expect(
      rewriteDocsHref("docs/decisions/open-questions.md", "README.md"),
    ).toBe("../readme/");
  });

  test("root readme collapses to the revision index", () => {
    expect(
      rewriteDocsHref("docs/decisions/open-questions.md", "../README.md"),
    ).toBe("../../");
  });

  test("self link collapses to ./", () => {
    expect(
      rewriteDocsHref("docs/decisions/open-questions.md", "open-questions.md"),
    ).toBe("./");
  });

  test("nested readme to nested readme", () => {
    expect(
      rewriteDocsHref(
        "docs/projects/bitty/architecture/overview.md",
        "final/README.md",
      ),
    ).toBe("../final/readme/");
  });

  test("leaves unmappable and escaping references unchanged", () => {
    expect(rewriteDocsHref("docs/README.md", "../TODO.md")).toBeNull();
    expect(rewriteDocsHref("docs/README.md", "sources/x.md")).toBeNull();
    expect(
      rewriteDocsHref(
        "docs/decisions/adrs/ADR-0008-headless.md",
        "https://example.com/a.md",
      ),
    ).toBeNull();
    expect(
      rewriteDocsHref("docs/decisions/adrs/ADR-0008-headless.md", "#local"),
    ).toBeNull();
  });
});

describe("rewriteDocsHref assets", () => {
  test("linked html asset beside the document tree", () => {
    expect(
      rewriteDocsHref(
        "docs/projects/bitty/architecture/overview.md",
        "interactive/index.html",
      ),
    ).toBe("../interactive/index.html");
  });

  test("svg asset in a subdirectory (mirrors the corpus)", () => {
    expect(
      rewriteDocsHref(
        "docs/projects/bitty/architecture/overview.md",
        "final/00-overview.svg",
      ),
    ).toBe("../final/00-overview.svg");
  });

  test("leaves assets escaping docs/ unchanged", () => {
    expect(rewriteDocsHref("docs/README.md", "../assets/logo.png")).toBeNull();
  });
});

describe("rewriteDocsHref directory links", () => {
  test("trailing-slash directory prefers README then index", () => {
    expect(
      rewriteDocsHref("docs/decisions/index.md", "adrs/", {
        isDirectory: () => true,
      }),
    ).toBe("./adrs/readme/");
  });

  test("bare directory without a probe stays unchanged when unmappable", () => {
    expect(rewriteDocsHref("docs/README.md", "sources")).toBeNull();
  });

  test("bare name known to be a file rewrites as an asset", () => {
    expect(
      rewriteDocsHref("docs/decisions/index.md", "data", {
        isDirectory: () => false,
      }),
    ).toBe("./data");
  });

  test("bare directory with a probe resolves the index", () => {
    expect(
      rewriteDocsHref("docs/decisions/index.md", "adrs", {
        isDirectory: (p) => p === "docs/decisions/adrs",
      }),
    ).toBe("./adrs/readme/");
  });
});
