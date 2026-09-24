/**
 * Contract fixtures for the CDN asset URL helpers (`./cdn.ts`).
 *
 * Pins the public URL scheme future lanes rely on: the bucket-relative key
 * space (`images/`, `videos/`, `fonts/`), fail-closed validation of
 * out-of-scheme keys, and round-tripping through `isCdnUrl`.
 */

import { describe, expect, test } from "bun:test";

import { CDN_BASE_URL, cdnUrl, isCdnUrl } from "./cdn.ts";

describe("cdnUrl", () => {
  test("resolves keys under each documented prefix", () => {
    expect(cdnUrl("images/hero-a1b2c3d4.avif")).toBe(
      `${CDN_BASE_URL}/images/hero-a1b2c3d4.avif`,
    );
    expect(cdnUrl("videos/demo-00-intro.mp4")).toBe(
      `${CDN_BASE_URL}/videos/demo-00-intro.mp4`,
    );
    expect(cdnUrl("fonts/bittie-display.woff2")).toBe(
      `${CDN_BASE_URL}/fonts/bittie-display.woff2`,
    );
  });

  test("rejects keys outside the prefix scheme", () => {
    expect(() => cdnUrl("")).toThrow();
    expect(() => cdnUrl("hero.avif")).toThrow();
    expect(() => cdnUrl("docs/hero.avif")).toThrow();
    expect(() => cdnUrl("/images/hero.avif")).toThrow();
    expect(() => cdnUrl("images/../hero.avif")).toThrow();
    expect(() => cdnUrl("images/")).toThrow();
  });
});

describe("isCdnUrl", () => {
  test("accepts CDN origins and rejects everything else", () => {
    expect(isCdnUrl(CDN_BASE_URL)).toBe(true);
    expect(isCdnUrl(cdnUrl("images/hero.avif"))).toBe(true);
    expect(isCdnUrl("https://bitty.run/images/hero.avif")).toBe(false);
    expect(isCdnUrl("https://cdn.bitty.run.evil.example/hero.avif")).toBe(
      false,
    );
  });
});
