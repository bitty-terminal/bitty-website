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

import {
  nearestPublishedAncestor,
  sourcePathToRouteIdentity,
} from "./docsRoutes.ts";
import { withholdListEntries } from "./publicationPolicy.ts";
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
 * Routes that answered a redirect before the T5 multi-source change and must
 * keep answering one (#98 §5: no URL 404s).
 *
 * Two groups. In the pinned aggregated corpus every route here is either
 * demoted (its post-migration page ships a policy 301 of its own) or absent
 * because the source that owns the page has not landed yet; in both cases the
 * route is a leaf whose single correct interim target is `/docs/`, the nearest
 * published ancestor. The 33 pages of `publication-withhold-list.json` are not
 * here: they are withheld precisely because they never had a route.
 *
 *   - the 28 remaining flat CTX-0185 aliases: `docs/specifications/*.md`
 *     (the section index `readme` included) and `docs/extensibility/*.md`
 *     (2 files) as of the revision before that migration, minus the 7 aliases
 *     the T6 `bitty-plugins-docs` onboarding retargeted (`RETARGETED_ROUTES`).
 *     The two containers these live under were retargeted to `/docs/`, which
 *     drops their wildcard, so without a per-route entry 28 routes x 3 hosted
 *     versions turn from 301 into 404 — the same class of loss as the entries
 *     above, one level down;
 *   - the 6 routes carved out of the pinned bitty-docs revision
 *     whose owning corpus has not landed yet.
 *
 * Shrink-only: an entry leaves this list when the owning corpus lands and
 * publishes the page (then the entry moves to `RETARGETED_ROUTES` with the
 * exact target, or is dropped when the page publishes at its old URL again).
 */
const INTERIM_CONTINUITY_ROUTES = [
  "/docs/specifications/ai-architecture/",
  "/docs/specifications/browser-agent-pre-study/",
  "/docs/specifications/cli-contract-rfc/",
  "/docs/specifications/compatibility-milestone-rfc/",
  "/docs/specifications/configuration-model-rfc/",
  "/docs/specifications/default-distribution-rfc/",
  "/docs/specifications/devtools-rfc/",
  "/docs/specifications/governance-rfc/",
  "/docs/specifications/input-pointer-rfc/",
  "/docs/specifications/ipc-agent-rfc/",
  "/docs/specifications/isolation-resource-rfc/",
  "/docs/specifications/lua-runtime-rfc/",
  "/docs/specifications/package-followup-rfc/",
  "/docs/specifications/package-lifecycle-rfc/",
  "/docs/specifications/panel-runtime-pre-study/",
  "/docs/specifications/performance-budget-rfc/",
  "/docs/specifications/readme/",
  "/docs/specifications/rich-presentation-rfc/",
  "/docs/specifications/risk-evidence-rfc/",
  "/docs/specifications/semantic-terminal-rfc/",
  "/docs/specifications/status-system/",
  "/docs/specifications/terminal-feature-gap-analysis/",
  "/docs/specifications/terminal-registry-view-lifecycle-rfc/",
  "/docs/specifications/terminal-state-rfc/",
  "/docs/specifications/text-rendering-rfc/",
  "/docs/specifications/ui-compositor-gap-analysis/",
  "/docs/specifications/website-delivery-rfc/",
  "/docs/specifications/workspace-compositor/",
  "/docs/projects/bitty/specifications/ai-architecture/",
  "/docs/projects/bitty/specifications/ipc-agent-rfc/",
  "/docs/projects/bitty/specifications/isolation-resource-rfc/",
  "/docs/projects/bitty/specifications/lua-runtime-rfc/",
  "/docs/projects/bitty/specifications/package-followup-rfc/",
  "/docs/projects/bitty/specifications/package-lifecycle-rfc/",
] as const;

/**
 * Routes that turned from an interim `/docs/` 301 into an exact 301 at the T6
 * `bitty-plugins-docs` onboarding (#98). 7 flat CTX-0185 aliases plus the 7
 * routes that answered a redirect from the pinned `projects/bitty/...` path
 * after T5 carved the tree out. Both groups now name the exact published
 * `projects/plugins/...` page; the target is a leaf page, so each entry stays
 * exact-only (`descendants: false`).
 */
const RETARGETED_ROUTES: readonly (readonly [string, string])[] = [
  [
    "/docs/extensibility/package-management/",
    "/docs/projects/plugins/extensibility/package-management/",
  ],
  [
    "/docs/extensibility/plugin-system/",
    "/docs/projects/plugins/extensibility/plugin-system/",
  ],
  [
    "/docs/specifications/plugin-api-v1-lua-surface-rfc/",
    "/docs/projects/plugins/sdk/plugin-api-v1-lua-surface-rfc/",
  ],
  [
    "/docs/specifications/plugin-host-runtime-rfc/",
    "/docs/projects/plugins/runtime/plugin-host-runtime-rfc/",
  ],
  [
    "/docs/specifications/plugin-platform-rfc/",
    "/docs/projects/plugins/specifications/plugin-platform-rfc/",
  ],
  [
    "/docs/specifications/plugin-reuse-and-providers/",
    "/docs/projects/plugins/packaging/plugin-reuse-and-providers/",
  ],
  [
    "/docs/specifications/ui-extensibility-architecture/",
    "/docs/projects/plugins/architecture/ui-extensibility-architecture/",
  ],
  [
    "/docs/projects/bitty/extensibility/package-management/",
    "/docs/projects/plugins/extensibility/package-management/",
  ],
  [
    "/docs/projects/bitty/extensibility/plugin-system/",
    "/docs/projects/plugins/extensibility/plugin-system/",
  ],
  [
    "/docs/projects/bitty/specifications/plugin-api-v1-lua-surface-rfc/",
    "/docs/projects/plugins/sdk/plugin-api-v1-lua-surface-rfc/",
  ],
  [
    "/docs/projects/bitty/specifications/plugin-host-runtime-rfc/",
    "/docs/projects/plugins/runtime/plugin-host-runtime-rfc/",
  ],
  [
    "/docs/projects/bitty/specifications/plugin-platform-rfc/",
    "/docs/projects/plugins/specifications/plugin-platform-rfc/",
  ],
  [
    "/docs/projects/bitty/specifications/plugin-reuse-and-providers/",
    "/docs/projects/plugins/packaging/plugin-reuse-and-providers/",
  ],
  [
    "/docs/projects/bitty/specifications/ui-extensibility-architecture/",
    "/docs/projects/plugins/architecture/ui-extensibility-architecture/",
  ],
] as const;

/** The flat group is the pre-migration tree minus the 7 aliases T6 retargeted:
 * 28 specifications/extensibility files. Pinned as arithmetic so dropping one
 * route has to be argued here, not just in the list above. */
const FLAT_ALIAS_ROUTES = 28;
const CARVED_OUT_ROUTES = 6;

describe("interim redirect continuity for moved routes (#98)", () => {
  const entries = JSON.parse(
    readFileSync(join(import.meta.dir, "..", "redirects.json"), "utf8"),
  ) as readonly RedirectEntry[];

  test("the fixture is the whole set, with no duplicate route", () => {
    const listed = [...INTERIM_CONTINUITY_ROUTES];
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.length).toBe(FLAT_ALIAS_ROUTES + CARVED_OUT_ROUTES);
  });

  test("every moved route still answers 301 to a published ancestor", () => {
    for (const old of INTERIM_CONTINUITY_ROUTES) {
      const entry = entries.find((candidate) => candidate.old === old);
      expect(entry, `no redirect entry for ${old}`).toBeDefined();
      expect(entry?.status).toBe(301);
      expect(entry?.new).toBe("/docs/");
      expect(entry?.descendants).toBe(false);
    }
  });

  test("every retargeted route answers 301 to its exact published page", () => {
    for (const [old, target] of RETARGETED_ROUTES) {
      const entry = entries.find((candidate) => candidate.old === old);
      expect(entry, `no redirect entry for ${old}`).toBeDefined();
      expect(entry?.status).toBe(301);
      expect(entry?.new).toBe(target);
      expect(entry?.descendants).toBe(false);
      // The new target is no other entry's source: no 301 chain.
      expect(entries.some((candidate) => candidate.old === target)).toBe(false);
      // The reason names the exact target, not the interim ancestor.
      expect(entry?.reason).toContain(target);
      expect(entry?.reason).not.toContain("interim target /docs/");
    }
  });
});

/**
 * T7 `bitty-ai-docs` onboarding: the determination, with evidence, that NO
 * route which answered a redirect before the change gains a published target
 * from the AI corpus — so every interim `/docs/` entry stays exactly as it was.
 *
 * This is what the plan's T7 line "the remaining moved-route redirects" means:
 * each route below was answered by a 301 before T7 and its post-migration page
 * lives in the AI corpus, so it is the only candidate for a retarget; the
 * plan's expectation is zero. The AI corpus publishes 0 pages under the
 * unchanged #97 rule — all 11 of its declaring pages are
 * `contributor`/`mixed`/`security-reviewer` and are recorded in
 * `publication-withhold-list.json` — so each successor exists in the mirror but
 * is withheld, i.e. it has no route and is not a legal target. Retargeting here
 * would point a 301 at a route with no page, the class of loss §3.3 forbids.
 *
 * Pinned as a test so the day the corpus flips a page on, this fails and the
 * entry must move to `RETARGETED_ROUTES` (or be dropped) in the same reviewed
 * change. Do not "fix" it by editing `src/redirects.json` without that evidence.
 */
const AI_MOVED_ROUTES: readonly (readonly [string, string])[] = [
  // [route answered by a 301 today, successor mirror path in the AI corpus]
  [
    "/docs/specifications/ai-architecture/",
    "docs/projects/bitty-ai/architecture/ai-architecture.md",
  ],
  [
    "/docs/specifications/browser-agent-pre-study/",
    "docs/projects/bitty-ai/interfaces/browser-agent-pre-study.md",
  ],
  [
    "/docs/specifications/ipc-agent-rfc/",
    "docs/projects/bitty-ai/specifications/ipc-agent-rfc.md",
  ],
  [
    "/docs/projects/bitty/specifications/ai-architecture/",
    "docs/projects/bitty-ai/architecture/ai-architecture.md",
  ],
  [
    "/docs/projects/bitty/specifications/ipc-agent-rfc/",
    "docs/projects/bitty-ai/specifications/ipc-agent-rfc.md",
  ],
] as const;

describe("AI moved-route redirect determination (#98 T7)", () => {
  const entries = JSON.parse(
    readFileSync(join(import.meta.dir, "..", "redirects.json"), "utf8"),
  ) as readonly RedirectEntry[];
  const manifest = JSON.parse(
    readFileSync(
      join(import.meta.dir, "..", "content", "docs-manifest.json"),
      "utf8",
    ),
  ) as {
    readonly sources: readonly {
      readonly id: string;
      readonly files: Readonly<Record<string, string>>;
      readonly published_routes: readonly string[];
    }[];
  };
  const published = new Set(
    manifest.sources.flatMap((source) => source.published_routes),
  );
  const withheld = new Set(withholdListEntries().map((entry) => entry.path));
  const aiFiles = new Set(
    Object.keys(
      manifest.sources.find((source) => source.id === "bitty-ai-docs")?.files ??
        {},
    ),
  );

  test("the AI source publishes zero routes at its pinned revision", () => {
    const ai = manifest.sources.find((source) => source.id === "bitty-ai-docs");
    expect(ai).toBeDefined();
    expect(ai?.published_routes).toEqual([]);
  });

  test("every candidate successor is consumed but publishes no route", () => {
    for (const [, successor] of AI_MOVED_ROUTES) {
      expect(aiFiles.has(successor), `${successor} is not consumed`).toBe(true);
      const route = sourcePathToRouteIdentity(successor).routeWithoutVersion;
      expect(
        published.has(route),
        `${successor} is published; a retarget may now be required`,
      ).toBe(false);
      // Either the corpus declares it for publication and the unchanged #97
      // rule withholds it, or it does not request publication at all
      // (`interfaces/browser-agent-pre-study.md`). In both cases it has no
      // route, so the interim `/docs/` target is the only legal one.
      const declares = /^website_publish:\s*true$/mu.test(
        readFileSync(
          join(import.meta.dir, "..", "content", "docs", successor),
          "utf8",
        ),
      );
      expect(
        declares,
        `${successor} declares website_publish: true but is not withheld`,
      ).toBe(withheld.has(successor));
    }
  });

  test("every candidate route keeps its interim /docs/ target (no retarget)", () => {
    for (const [old] of AI_MOVED_ROUTES) {
      const entry = entries.find((candidate) => candidate.old === old);
      expect(entry, `no redirect entry for ${old}`).toBeDefined();
      expect(entry?.status).toBe(301);
      expect(entry?.new).toBe("/docs/");
      expect(entry?.descendants).toBe(false);
    }
  });

  test("no AI successor route is a redirect target and none is published", () => {
    for (const [, successor] of AI_MOVED_ROUTES) {
      const route = sourcePathToRouteIdentity(successor).routeWithoutVersion;
      expect(published.has(route)).toBe(false);
      expect(entries.some((candidate) => candidate.new === route)).toBe(false);
    }
  });
});
