/**
 * Publication redirect tests (bitty-website#97).
 *
 * Excluded pages leave the site as 301s through the one redirect mechanism
 * (RD-3/RD-6): the policy's plan is materialized as redirect entries and the
 * nearest surviving ancestor is resolved by `./docsRoutes.ts`.
 */

import { describe, expect, test } from "bun:test";

import { nearestPublishedAncestor } from "./docsRoutes.ts";
import {
  PUBLICATION_REDIRECT_REASON,
  buildPublicationRedirectEntries,
  lowestVersion,
} from "./redirects.ts";

describe("nearestPublishedAncestor", () => {
  const published = new Set<string>([
    "/docs/",
    "/docs/projects/bitty/specifications/",
    "/docs/projects/bitty/specifications/plugin-platform-rfc/",
  ]);

  test("returns the closest published ancestor", () => {
    expect(
      nearestPublishedAncestor(
        "/docs/projects/bitty/specifications/cli-contract-rfc/",
        published,
      ),
    ).toBe("/docs/projects/bitty/specifications/");
  });

  test("falls back to the revision index", () => {
    expect(
      nearestPublishedAncestor("/docs/security/risk-register/", published),
    ).toBe("/docs/");
  });

  test("never returns the route itself", () => {
    expect(
      nearestPublishedAncestor(
        "/docs/projects/bitty/specifications/plugin-platform-rfc/",
        published,
      ),
    ).toBe("/docs/projects/bitty/specifications/");
  });

  test("fails closed when nothing above the route is published", () => {
    expect(
      nearestPublishedAncestor(
        "/docs/security/risk-register/",
        new Set(["/docs/other/"]),
      ),
    ).toBeNull();
  });
});

describe("buildPublicationRedirectEntries", () => {
  test("materializes the plan as 301 entries", () => {
    expect(
      buildPublicationRedirectEntries(
        [{ from: "/docs/security/risk-register/", to: "/docs/" }],
        "0.1.0",
      ),
    ).toEqual([
      {
        old: "/docs/security/risk-register/",
        new: "/docs/",
        status: 301,
        reason: PUBLICATION_REDIRECT_REASON,
        effective_version: "0.1.0",
      },
    ]);
  });

  test("rejects a non-route pair", () => {
    expect(() =>
      buildPublicationRedirectEntries(
        [{ from: "/docs/security/overview", to: "/docs/" }],
        "0.1.0",
      ),
    ).toThrow(/exact \/docs\/ prefix/u);
  });

  test("rejects a self-redirect", () => {
    expect(() =>
      buildPublicationRedirectEntries(
        [{ from: "/docs/security/", to: "/docs/security/" }],
        "0.1.0",
      ),
    ).toThrow(/loop/u);
  });
});

describe("lowestVersion", () => {
  test("returns the lowest concrete version so every segment is covered", () => {
    expect(lowestVersion(["0.2.0", "0.1.0", "latest"])).toBe("0.1.0");
    expect(lowestVersion(["0.1.0"])).toBe("0.1.0");
  });

  test("fails closed without a concrete version", () => {
    expect(() => lowestVersion(["latest", "stable"])).toThrow(
      /no concrete semver/u,
    );
  });
});
