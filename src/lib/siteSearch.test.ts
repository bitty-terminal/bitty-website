/**
 * CTX-0040 fixtures for the keyword scorer (`./siteSearch.ts`).
 *
 * Pins the ranking contract: title outranks description, category/slug, then
 * capped body frequency; empty and stopword-only queries return nothing;
 * result URLs preserve the caller's version segment (`latest`, `stable`, or
 * explicit `x.y.z`) so version aliases keep working.
 */

import { describe, expect, test } from "bun:test";

import {
  recordHref,
  searchRecords,
  tokenize,
  type SearchRecord,
} from "./siteSearch.ts";

const RECORDS: readonly SearchRecord[] = [
  {
    slug: "configuration/themes",
    title: "Themes",
    description: "Configure Bitty color themes.",
    category: "configuration",
    text: "A theme sets colors for the terminal panels and prompts.",
  },
  {
    slug: "architecture/overview",
    title: "Architecture overview",
    description: "How Bitty is structured.",
    category: "architecture",
    text: "The terminal core renders panels. Themes are documented elsewhere.",
  },
  {
    slug: "",
    title: "Documentation",
    description: "Index of all Bitty documentation.",
    category: "overview",
    text: "Start here for configuration and architecture guides.",
  },
];

describe("tokenize", () => {
  test("lowercases and splits on non-alphanumerics", () => {
    expect(tokenize("Color-Themes 101")).toEqual(["color", "themes", "101"]);
  });

  test("drops blanks and stopwords", () => {
    expect(tokenize("  the ")).toEqual([]);
    expect(tokenize("how to configure themes")).toEqual([
      "configure",
      "themes",
    ]);
  });
});

describe("searchRecords ranking", () => {
  test("title match outranks body-only match", () => {
    const hits = searchRecords(RECORDS, "themes");
    expect(hits.map((hit) => hit.record.slug)).toEqual([
      "configuration/themes",
      "architecture/overview",
    ]);
    expect(hits[0]?.score).toBeGreaterThan(hits[1]?.score ?? 0);
  });

  test("description and category matches count", () => {
    expect(
      searchRecords(RECORDS, "configure").map((hit) => hit.record.slug),
    ).toEqual(["configuration/themes"]);
    expect(
      searchRecords(RECORDS, "architecture").map((hit) => hit.record.slug),
    ).toContain("architecture/overview");
  });

  test("multi-token queries sum across fields", () => {
    const hits = searchRecords(RECORDS, "colors panels");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.record.slug).toBe("configuration/themes");
  });

  test("empty and stopword-only queries return nothing", () => {
    expect(searchRecords(RECORDS, "")).toEqual([]);
    expect(searchRecords(RECORDS, "   ")).toEqual([]);
    expect(searchRecords(RECORDS, "the and of")).toEqual([]);
  });

  test("unmatched queries return nothing and limit caps hits", () => {
    expect(searchRecords(RECORDS, "sourdough")).toEqual([]);
    expect(searchRecords(RECORDS, "bitty", 1).length).toBeLessThanOrEqual(1);
  });

  test("results carry positive scores in descending order", () => {
    const hits = searchRecords(RECORDS, "bitty terminal");
    for (let index = 1; index < hits.length; index += 1) {
      expect(hits[index - 1]?.score).toBeGreaterThanOrEqual(
        hits[index]?.score ?? 0,
      );
    }
    for (const hit of hits) expect(hit.score).toBeGreaterThan(0);
  });
});

describe("recordHref", () => {
  const record = RECORDS[0] as SearchRecord;

  test("preserves latest/stable/explicit version segments", () => {
    expect(recordHref(record, "latest")).toBe(
      "/docs/latest/configuration/themes/",
    );
    expect(recordHref(record, "stable")).toBe(
      "/docs/stable/configuration/themes/",
    );
    expect(recordHref(record, "0.1.0")).toBe(
      "/docs/0.1.0/configuration/themes/",
    );
  });

  test("revision index resolves to the version index", () => {
    expect(recordHref({ slug: "" }, "latest")).toBe("/docs/latest/");
  });

  test("rejects empty or path-breaking segments", () => {
    for (const bad of ["", "a/b", "..\\x", "has space"]) {
      expect(() => recordHref(record, bad)).toThrow();
    }
  });
});
