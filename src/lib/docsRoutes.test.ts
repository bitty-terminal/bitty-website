/**
 * RM-6 fixtures for the authoritative route mapper (`./docsRoutes.ts`).
 *
 * The table pins the renderer-visible contract: every segment slugged like
 * the Astro glob loader, a trailing `index` dropped at any depth, `readme`
 * kept as an explicit slug, and `docs/README.md` as the revision index.
 * Negative tests prove distinct sources that would share a public route fail
 * closed instead of silently overwriting each other.
 */

import { describe, expect, test } from "bun:test";

import {
  sourceDirToRouteDir,
  sourcePathToRouteIdentity,
  validateRouteCollisions,
} from "./docsRoutes.ts";

const ROUTES: Readonly<Record<string, string>> = {
  "docs/README.md": "/docs/",
  "docs/decisions/README.md": "/docs/decisions/readme/",
  "docs/decisions/index.md": "/docs/decisions/",
  "docs/decisions/Index.md": "/docs/decisions/",
  "docs/decisions/open-questions.md": "/docs/decisions/open-questions/",
  "docs/decisions/adrs/README.md": "/docs/decisions/adrs/readme/",
  "docs/decisions/adrs/index.md": "/docs/decisions/adrs/",
  "docs/decisions/adrs/ADR-0008-headless.md":
    "/docs/decisions/adrs/adr-0008-headless/",
  "docs/development/website-sync.md": "/docs/development/website-sync/",
  "docs/findings/FIND-0001-astro-typescript-7-check-compatibility.md":
    "/docs/findings/find-0001-astro-typescript-7-check-compatibility/",
  "docs/projects/README.md": "/docs/projects/readme/",
  "docs/projects/bitty/README.md": "/docs/projects/bitty/readme/",
  "docs/projects/bitty/architecture/overview.md":
    "/docs/projects/bitty/architecture/overview/",
  "docs/projects/bitty/architecture/final/README.md":
    "/docs/projects/bitty/architecture/final/readme/",
};

describe("sourcePathToRouteIdentity fixtures", () => {
  for (const [source, route] of Object.entries(ROUTES)) {
    test(`${source} -> ${route}`, () => {
      const entry = sourcePathToRouteIdentity(source);
      expect(entry.routeWithoutVersion).toBe(route);
      expect(entry.versionedRoute("0.1.0")).toBe(
        route === "/docs/"
          ? "/docs/0.1.0/"
          : route.replace("/docs/", "/docs/0.1.0/"),
      );
      expect(entry.sourcePath).toBe(source);
    });
  }

  test("category of a nested source is the segment after docs/", () => {
    expect(
      sourcePathToRouteIdentity("docs/projects/bitty/architecture/overview.md")
        .category,
    ).toBe("projects");
  });

  test("rejects invalid version segments", () => {
    const entry = sourcePathToRouteIdentity("docs/decisions/open-questions.md");
    expect(() => entry.versionedRoute("")).toThrow();
    expect(() => entry.versionedRoute("a b")).toThrow();
    expect(() => entry.versionedRoute("a/b")).toThrow();
  });

  test("rejects unroutable sources", () => {
    expect(() => sourcePathToRouteIdentity("README.md")).toThrow();
    expect(() => sourcePathToRouteIdentity("docs/TODO.md")).toThrow();
    expect(() => sourcePathToRouteIdentity("docs/sources/x.md")).toThrow();
    expect(() => sourcePathToRouteIdentity("docs/handoff/README.md")).toThrow();
    expect(() =>
      sourcePathToRouteIdentity("docs/decisions/notes.txt"),
    ).toThrow();
    expect(() =>
      sourcePathToRouteIdentity("docs/development/....md"),
    ).toThrow();
  });
});

describe("sourceDirToRouteDir", () => {
  test("maps asset directories with the same segment slugging", () => {
    expect(sourceDirToRouteDir("docs")).toBe("/docs/");
    expect(sourceDirToRouteDir("docs/decisions/adrs")).toBe(
      "/docs/decisions/adrs/",
    );
    expect(
      sourceDirToRouteDir("docs/projects/bitty/architecture/interactive"),
    ).toBe("/docs/projects/bitty/architecture/interactive/");
  });

  test("rejects unknown categories", () => {
    expect(() => sourceDirToRouteDir("docs/sources")).toThrow();
  });
});

describe("validateRouteCollisions negatives", () => {
  test("accepts distinct routes", () => {
    expect(() =>
      validateRouteCollisions([
        "docs/decisions/index.md",
        "docs/decisions/README.md",
        "docs/decisions/open-questions.md",
      ]),
    ).not.toThrow();
    expect(() => validateRouteCollisions([])).not.toThrow();
  });

  test("rejects slug-equivalent filenames in one directory", () => {
    expect(() =>
      validateRouteCollisions([
        "docs/development/Foo Bar.md",
        "docs/development/foo-bar.md",
      ]),
    ).toThrow(/Route collision/);
  });

  test("rejects case-variant index files collapsing to one route", () => {
    expect(() =>
      validateRouteCollisions([
        "docs/development/index.md",
        "docs/development/Index.md",
      ]),
    ).toThrow(/Route collision/);
  });

  test("rejects title-case duplicates of one document", () => {
    expect(() =>
      validateRouteCollisions([
        "docs/development/Quick Start.md",
        "docs/development/quick-start.md",
      ]),
    ).toThrow(/Route collision/);
  });

  test("rejects nested duplicates", () => {
    expect(() =>
      validateRouteCollisions([
        "docs/decisions/adrs/ADR-0008-headless.md",
        "docs/decisions/adrs/adr-0008-headless.md",
      ]),
    ).toThrow(/Route collision/);
  });
});
