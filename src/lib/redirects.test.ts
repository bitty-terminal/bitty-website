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
  CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT,
  CLOUDFLARE_STATIC_REDIRECT_LIMIT,
  CLOUDFLARE_TOTAL_REDIRECT_LIMIT,
  PUBLICATION_REDIRECT_REASON,
  buildPublicationRedirectEntries,
  lowestVersion,
  renderEdgeRedirects,
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

describe("renderEdgeRedirects (Cloudflare _redirects budget)", () => {
  const expanded = (reason: string, index: number) => ({
    from: `/docs/latest/legacy-${index}/`,
    to: `/docs/latest/legacy-target-${index}/`,
    status: 301 as const,
    reason,
    effective_version: "0.1.0",
    version: "0.1.0",
  });

  test("a publication demotion is an exact rule only", () => {
    const output = renderEdgeRedirects(
      [
        expanded(PUBLICATION_REDIRECT_REASON, 1),
        expanded("legacy subtree move", 2),
      ],
      {},
    );
    const lines = output.split("\n");
    expect(lines.filter((line) => line.includes("legacy-1"))).toEqual([
      "/docs/latest/legacy-1/ /docs/latest/legacy-target-1/ 301",
    ]);
    // A subtree move still needs the wildcard form: it carries descendants.
    expect(lines.filter((line) => line.includes("legacy-2/*"))).toHaveLength(1);
  });

  test("the static budget is 2,000, not the 2,100 combined ceiling", () => {
    const staticRules = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        expanded(PUBLICATION_REDIRECT_REASON, i),
      );
    expect(CLOUDFLARE_STATIC_REDIRECT_LIMIT).toBe(2000);
    expect(() => renderEdgeRedirects(staticRules(2000), {})).not.toThrow();
    expect(() => renderEdgeRedirects(staticRules(2001), {})).toThrow(
      /2001 static rules, above Cloudflare's limit of 2000/,
    );
    // 2,001-2,100 static-only rules used to pass the guard while the API rejects them.
    expect(() => renderEdgeRedirects(staticRules(2100), {})).toThrow(
      /static rules/,
    );
  });

  test("the combined ceiling is 2,100 rules and is reachable exactly", () => {
    expect(CLOUDFLARE_TOTAL_REDIRECT_LIMIT).toBe(2100);
    // A wildcard rule contributes one dynamic rule and one exact (static)
    // sibling, so a tree at both per-kind limits (100 dynamic + 2,000 static)
    // is 1,900 publication rules plus 100 subtree moves: exactly 2,100 lines.
    const mixed = [
      ...Array.from({ length: CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT }, (_, i) =>
        expanded("legacy subtree move", i),
      ),
      ...Array.from({ length: 1900 }, (_, i) =>
        expanded(PUBLICATION_REDIRECT_REASON, i + 1000),
      ),
    ];
    expect(() => renderEdgeRedirects(mixed, {})).not.toThrow();
    // One more rule breaks the static budget, and the total ceiling is the
    // backstop for any future accounting that stops being exhaustive.
    expect(() =>
      renderEdgeRedirects(
        [...mixed, expanded(PUBLICATION_REDIRECT_REASON, 99_999)],
        {},
      ),
    ).toThrow(/static rules/);
  });

  test("fails closed when the dynamic budget would be exceeded", () => {
    const rules = Array.from(
      { length: CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT + 1 },
      (_, i) => expanded("legacy subtree move", i),
    );
    expect(() => renderEdgeRedirects(rules, {})).toThrow(
      /limit of 100 \(deployment code 100324\)/,
    );
  });
});
