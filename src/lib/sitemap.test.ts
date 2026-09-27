/**
 * Sitemap tests (Website Delivery RFC MV-6, website#97).
 *
 * The sitemap lists published pages only: an excluded page emits no HTML at
 * all (it ships a 301), so it cannot appear. Redirect stubs are skipped too —
 * a canonical sitemap lists destinations, not redirects.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SITEMAP_FILENAME,
  renderSitemap,
  routePathFromDistPath,
  sitemapRoutes,
  writeSitemaps,
} from "./sitemap.ts";

const ORIGIN = "https://example.test";
const tempDirs: string[] = [];

async function tempDist(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "bitty-website-sitemap-"));
  tempDirs.push(dir);
  for (const [relative, content] of Object.entries(files)) {
    const path = join(dir, relative);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
  }
  return dir;
}

afterAll(async () => {
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
});

describe("routePathFromDistPath", () => {
  test("maps directory indexes to routes", () => {
    expect(routePathFromDistPath("index.html")).toBe("/");
    expect(routePathFromDistPath("docs/latest/a/index.html")).toBe(
      "/docs/latest/a/",
    );
  });

  test("fails closed on a non-index page", () => {
    expect(() => routePathFromDistPath("docs/latest/a.html")).toThrow(
      /directory index/u,
    );
  });
});

describe("renderSitemap", () => {
  test("renders deterministic absolute URLs", () => {
    const xml = renderSitemap(ORIGIN, ["/", "/docs/latest/a/"]);
    expect(xml).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/docs/latest/a/</loc>`);
    expect(sitemapRoutes(xml)).toEqual(["/", "/docs/latest/a/"]);
  });
});

describe("writeSitemaps", () => {
  test("lists published pages only and skips redirect stubs", async () => {
    const outDir = await tempDist({
      "index.html": "<html><h1>Home</h1></html>",
      "docs/latest/a/index.html": "<html><h1>A</h1></html>",
      "docs/latest/alias/index.html":
        '<html><meta http-equiv="refresh" content="0;url=/docs/latest/a/"></html>',
      "docs/0.1.0/a/index.html": "<html><h1>A</h1></html>",
    });
    const counts = await writeSitemaps(outDir, {
      origin: ORIGIN,
      hostedVersions: ["latest", "0.1.0"],
      canonicalVersion: "latest",
    });
    expect(counts).toEqual({
      canonical: 2,
      perVersion: { latest: 1, "0.1.0": 1 },
    });
    const canonical = sitemapRoutes(
      await Bun.file(join(outDir, SITEMAP_FILENAME)).text(),
    );
    expect(canonical).toEqual(["/", "/docs/latest/a/"]);
    const perVersion = sitemapRoutes(
      await Bun.file(join(outDir, "docs", "0.1.0", SITEMAP_FILENAME)).text(),
    );
    expect(perVersion).toEqual(["/docs/0.1.0/a/"]);
  });

  test("fails closed when a hosted version emitted no page", async () => {
    const outDir = await tempDist({
      "index.html": "<html><h1>Home</h1></html>",
    });
    await expect(
      writeSitemaps(outDir, {
        origin: ORIGIN,
        hostedVersions: ["latest"],
        canonicalVersion: "latest",
      }),
    ).rejects.toThrow(/emitted no page/u);
  });
});
