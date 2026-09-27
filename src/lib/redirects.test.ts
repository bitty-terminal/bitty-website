/**
 * Publication redirect tests (bitty-website#97).
 *
 * Excluded pages leave the site as 301s through the one redirect mechanism
 * (RD-3/RD-6): the policy's plan is materialized as redirect entries and the
 * nearest surviving ancestor is resolved by `./docsRoutes.ts`.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { nearestPublishedAncestor } from "./docsRoutes.ts";
import {
  CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT,
  CLOUDFLARE_STATIC_REDIRECT_LIMIT,
  CLOUDFLARE_TOTAL_REDIRECT_LIMIT,
  PUBLICATION_REDIRECT_REASON,
  buildExpandedRedirectTable,
  buildPublicationRedirectEntries,
  lowestVersion,
  renderEdgeRedirects,
  renderRedirectEvidence,
  type RedirectEntry,
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
        descendants: false,
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

  test("leaf moves marked descendants:false do not consume the dynamic budget (#98)", () => {
    const versions = ["latest", "stable", "0.1.0"];
    // The 14 legacy subtree moves keep the wildcard form: 14 x 3 = 42 dynamic.
    const legacy: RedirectEntry[] = Array.from({ length: 14 }, (_, i) => ({
      old: `/docs/tree-${i}/`,
      new: `/docs/projects/bitty/tree-${i}/`,
      status: 301,
      reason: "bitty-docs partition migration (legacy subtree move)",
      effective_version: "0.1.0",
    }));
    // 19 moved leaf pages marked exact-only; a naive emitter would add 19 x 3
    // = 57 dynamic rules on top and reach 99 of Cloudflare's 100 slots.
    const leaves: RedirectEntry[] = Array.from({ length: 19 }, (_, i) => ({
      old: `/docs/old-leaf-${i}/`,
      new: `/docs/projects/plugins/specifications/leaf-${i}/`,
      status: 301,
      reason: "route move (#98)",
      effective_version: "0.1.0",
      descendants: false,
    }));
    const dynamicLines = (entries: readonly RedirectEntry[]) =>
      renderEdgeRedirects(buildExpandedRedirectTable(entries, versions), {})
        .split("\n")
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .filter((line) => {
          const pattern = line.split(/\s+/)[0] ?? "";
          return pattern.includes("*") || /:[a-zA-Z]/.test(pattern);
        });

    const withFlag = dynamicLines([...legacy, ...leaves]);
    expect(withFlag).toHaveLength(42);
    expect(withFlag.length).toBeLessThanOrEqual(
      CLOUDFLARE_DYNAMIC_REDIRECT_LIMIT,
    );

    const naive = dynamicLines([
      ...legacy,
      ...leaves.map((entry): RedirectEntry => ({
        old: entry.old,
        new: entry.new,
        status: entry.status,
        reason: entry.reason,
        effective_version: entry.effective_version,
      })),
    ]);
    expect(naive).toHaveLength(99);
    expect(naive.length).toBeGreaterThan(withFlag.length);
  });
});

describe("renderRedirectEvidence (deployed provenance key set, #98)", () => {
  const revisions = {
    "bitty-docs": "9891949ca20b245375ece9a9015d0f42458fd2b1",
  };

  test("carries docs_revisions (the pinned-source map) and no scalar docs_revision", () => {
    const payload = JSON.parse(
      renderRedirectEvidence([], {
        docsRevisions: revisions,
        hostedVersions: ["latest", "stable", "0.1.0"],
      }),
    );
    // The deployed-artifact schema change of #98: one entry per pinned source.
    expect(Object.keys(payload).sort()).toEqual([
      "docs_revisions",
      "hosted_versions",
      "redirects",
      "source",
    ]);
    expect(payload.docs_revisions).toEqual(revisions);
    expect("docs_revision" in payload).toBe(false);
  });
});

/**
 * Routes whose page left the pinned `bitty-docs` revision before the corpus
 * that owns it landed (#98 T5). Each was a 301 demotion, so removing the entry
 * would turn a working redirect into a 404 — the defect class this list exists
 * to catch. Shrink-only: an entry leaves this list only in the commit that
 * lands the owning corpus and publishes the page, at which point it points at
 * the exact target.
 */
const CARVED_OUT_DEMOTED_ROUTES = [
  "/docs/projects/bitty/specifications/ai-architecture/",
  "/docs/projects/bitty/specifications/ipc-agent-rfc/",
  "/docs/projects/bitty/specifications/isolation-resource-rfc/",
  "/docs/projects/bitty/specifications/lua-runtime-rfc/",
  "/docs/projects/bitty/specifications/package-followup-rfc/",
  "/docs/projects/bitty/specifications/package-lifecycle-rfc/",
] as const;

describe("interim redirect continuity for carved-out demoted routes (#98)", () => {
  const entries = JSON.parse(
    readFileSync(join(import.meta.dir, "..", "redirects.json"), "utf8"),
  ) as readonly RedirectEntry[];

  test("each carved-out demoted route still answers 301 to a published ancestor", () => {
    for (const old of CARVED_OUT_DEMOTED_ROUTES) {
      const entry = entries.find((candidate) => candidate.old === old);
      expect(entry, `no redirect entry for ${old}`).toBeDefined();
      expect(entry?.status).toBe(301);
      expect(entry?.new).toBe("/docs/");
      expect(entry?.descendants).toBe(false);
    }
  });
});
