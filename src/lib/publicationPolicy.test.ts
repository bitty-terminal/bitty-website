/**
 * Publication policy unit tests (bitty-website#97, closing website#102 D2/D6).
 *
 * Pins the one eligibility definition the build, the content layer, and the
 * sync/check pipeline share:
 *
 * - the audience / document_type rule and the allow-list exception;
 * - fail closed: a `website_publish: true` page that is neither eligible nor
 *   allow-listed aborts the gate (proved against the real pinned mirror and
 *   against synthetic corpora);
 * - shrink-only data files: the allow-list path set is pinned exactly, so
 *   adding an entry needs a reviewed edit here, and no governance corpus path
 *   may ever be allow-listed;
 * - the published set stays inside the coarse aggregate sanity bound, while the
 *   operative, attributable gate is each source's `published.min/max` band in
 *   the pin entry (#98 OQ-2 retired the single-source 25-35 page target).
 *
 * No host or checkout path is embedded: the mirror is located relative to
 * this module.
 */

import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import docsRevision from "../content/docs-revision.json" with { type: "json" };
import {
  loadPublicationCorpus,
  readPublicationCorpus,
} from "./publicationCorpus.ts";
import { mountForMirrorPath, parseDocsPinSet } from "./docsPins.ts";
import { sourcePathToRouteIdentity } from "./docsRoutes.ts";
import {
  ALLOWED_AUDIENCES,
  EXCLUDED_DOCUMENT_TYPES,
  PUBLICATION_POLICY_VERSION,
  PUBLISHED_PAGE_MAX,
  PUBLISHED_PAGE_MIN,
  PublicationPolicyError,
  allowListEntries,
  assertPublicationPolicy,
  contractNotImplemented,
  decidePublication,
  evaluatePublicationPolicy,
  flipListEntries,
  isForbiddenAllowListEntry,
  isForbiddenAllowListPath,
  isForbiddenPublicationPath,
  isPublished,
  meetsEligibilityRule,
  TYPE_AUDIENCE_EXCEPTIONS,
  type PublicationMetadata,
  withholdListEntries,
} from "./publicationPolicy.ts";

/** The pinned corpus mirror, resolved without embedding a checkout path. */
const MIRROR_ROOT = fileURLToPath(new URL("../content/docs", import.meta.url));

/**
 * Shrink-only pin of the allow-list.
 *
 * Every entry is an explicit, reviewed decision. Adding a page here (or
 * removing one) fails this test until the expectation below is updated in the
 * same change, which is what "shrink-only, reviewed" means in practice.
 */
const EXPECTED_ALLOW_LIST_PATHS: readonly string[] = [
  "docs/README.md",
  "docs/projects/bitty/architecture/README.md",
  "docs/projects/bitty/architecture/final/README.md",
  "docs/projects/bitty/architecture/overview.md",
  "docs/projects/bitty/configuration/lua-and-xdg.md",
  "docs/projects/bitty/examples/README.md",
  "docs/projects/bitty/product/vision.md",
  "docs/projects/bitty/reference/README.md",
  "docs/projects/bitty/requirements/README.md",
  "docs/roadmap/README.md",
];

/**
 * The allow-list entries the `bitty-terminal-docs` onboarding re-attributed
 * (every entry under `docs/projects/`, which the `bitty-docs` mount no longer
 * supplies). The two entries outside it stay with `bitty-docs`: the revision
 * index (`docs/README.md`) and the roadmap index.
 */
const EXPECTED_ALLOW_LIST_TERMINAL_PATHS: readonly string[] = [
  "docs/projects/bitty/architecture/README.md",
  "docs/projects/bitty/architecture/final/README.md",
  "docs/projects/bitty/architecture/overview.md",
  "docs/projects/bitty/configuration/lua-and-xdg.md",
  "docs/projects/bitty/examples/README.md",
  "docs/projects/bitty/product/vision.md",
  "docs/projects/bitty/reference/README.md",
  "docs/projects/bitty/requirements/README.md",
];

/**
 * Demoted pages still awaiting the docs-side frontmatter flip (#98 owns it):
 * 52 before the `bitty-terminal-docs` onboarding, of which 17 are now owned by
 * that source (path-identical) and 6 were dropped because their page does not
 * exist in the aggregated corpus at the pinned revisions.
 */
const EXPECTED_FLIP_LIST_COUNT = 46;

/**
 * Shrink-only pin of the withhold list (bitty-website#98): declared-but-
 * ineligible pages, exact path set. Adding or removing an entry fails this
 * test until the expectation below is updated in the same reviewed change.
 * 14 are `bitty-terminal-docs` pages owned by `bitty-core`; 8 are
 * `bitty-plugins-docs` pages owned by `bitty-plugins` (T6 onboarding).
 */
const EXPECTED_WITHHOLD_PATHS: readonly string[] = [
  "docs/projects/bitty/configuration/README.md",
  "docs/projects/bitty/development/README.md",
  "docs/projects/bitty/interfaces/README.md",
  "docs/projects/bitty/product/README.md",
  "docs/projects/bitty/product/visual-identity.md",
  "docs/projects/bitty/security/README.md",
  "docs/projects/bitty/specifications/ai-surface-accepted-record.md",
  "docs/projects/bitty/specifications/overlay-ownership-reconciliation.md",
  "docs/projects/bitty/specifications/panel-content-scene-path-decision.md",
  "docs/projects/bitty/specifications/panel-placement-decision.md",
  "docs/projects/bitty/specifications/panel-runtime-rfc.md",
  "docs/projects/bitty/specifications/ui-convergence-roadmap.md",
  "docs/projects/bitty/specifications/ui-ux-invariant-set-candidate.md",
  "docs/projects/bitty/specifications/unified-mod-contract-candidate.md",
  "docs/projects/plugins/packaging/README.md",
  "docs/projects/plugins/packaging/package-followup-rfc.md",
  "docs/projects/plugins/packaging/package-lifecycle-rfc.md",
  "docs/projects/plugins/runtime/README.md",
  "docs/projects/plugins/runtime/isolation-resource-rfc.md",
  "docs/projects/plugins/runtime/lua-runtime-rfc.md",
  "docs/projects/plugins/specifications/README.md",
  "docs/projects/plugins/specifications/manifest-capability-authority.md",
];
const EXPECTED_WITHHOLD_COUNT = 22;

/**
 * The governance-path rule outranks the eligibility rule (review of #103, P1):
 * before it ran on allow-list entries only, so a plugin-author specification
 * under docs/decisions/ was published by rule while the same path was rejected
 * as an allow-list entry.
 */
test("a governance corpus path is never published, even when the rule would publish it", () => {
  expect(
    decidePublication(
      metadata({
        sourcePath: "docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md",
        audience: "plugin-author",
        document_type: "specification",
        website_publish: true,
      }),
    ).kind,
  ).toBe("demote");
  // A forbidden path that is already recorded as pending the docs-side flip is
  // demoted like any other demotion; a forbidden path nobody recorded fails
  // closed instead of being silently dropped.
  expect(
    decidePublication(
      metadata({
        sourcePath: "docs/security/threat-model.md",
        audience: "plugin-author",
        document_type: "specification",
        website_publish: true,
      }),
    ).kind,
  ).toBe("demote");
  expect(
    decidePublication(
      metadata({
        sourcePath: "docs/security/zz-new-governance-page.md",
        audience: "plugin-author",
        document_type: "specification",
        website_publish: true,
      }),
    ).kind,
  ).toBe("violation");
});

test("a security or provenance page cannot reach the site through the allow-list", () => {
  for (const path of [
    "docs/security/threat-model.md",
    "docs/security/overview.md",
    "docs/security/p0-acceptance-criteria.md",
    "docs/security/risk-register.md",
    "docs/provenance/README.md",
  ]) {
    expect({ path, forbidden: isForbiddenPublicationPath(path) }).toEqual({
      path,
      forbidden: true,
    });
  }
  expect(
    isForbiddenAllowListEntry({
      path: "docs/projects/bitty/anything.md",
      document_type: "policy",
    }),
  ).toBe(true);
  expect(
    isForbiddenAllowListEntry({
      path: "docs/projects/bitty/anything.md",
      document_type: "specification",
    }),
  ).toBe(false);
});

/**
 * The type exclusion has exactly one audience exception (owner decision on
 * issue #97): a plugin-author specification is the audience's own API surface.
 * Every other audience keeps failing closed, and register/policy/research have
 * no exception at all.
 */
test("a plugin-author specification publishes by rule; other audiences fail closed", () => {
  expect(TYPE_AUDIENCE_EXCEPTIONS).toHaveLength(1);
  expect(
    meetsEligibilityRule(
      metadata({
        sourcePath: "docs/projects/bitty/specifications/thing.md",
        audience: "plugin-author",
        document_type: "specification",
      }),
    ),
  ).toBe(true);
  for (const audience of [
    "contributor",
    "maintainer",
    "security-reviewer",
    "mixed",
  ]) {
    expect(
      meetsEligibilityRule(
        metadata({
          sourcePath: "docs/projects/bitty/specifications/thing.md",
          audience,
          document_type: "specification",
        }),
      ),
    ).toBe(false);
  }
  for (const document_type of ["register", "policy", "research"]) {
    expect(
      meetsEligibilityRule(
        metadata({
          sourcePath: "docs/projects/bitty/specifications/thing.md",
          audience: "plugin-author",
          document_type,
        }),
      ),
    ).toBe(false);
  }
});

function metadata(
  overrides: Pick<PublicationMetadata, "sourcePath"> &
    Partial<PublicationMetadata>,
): PublicationMetadata {
  return {
    audience: "user",
    document_type: "guide",
    website_publish: true,
    ...overrides,
  };
}

/**
 * Page count a synthetic corpus uses when it must satisfy the coarse
 * aggregate sanity bound (#98 OQ-2 re-based the global band; this is a test
 * fixture size, not a policy target).
 */
const BAND_SATISFYING_PAGE_COUNT = 25;

/** A corpus of eligible pages big enough to satisfy the published band. */
function eligibleCorpus(
  count: number = BAND_SATISFYING_PAGE_COUNT,
): PublicationMetadata[] {
  return Array.from({ length: count }, (_unused, index) =>
    metadata({
      sourcePath: `docs/projects/bitty/user-guide/page-${index}.md`,
      status: "accepted",
    }),
  );
}

describe("eligibility rule (audience x document_type)", () => {
  test("audiences are the reader-facing vocabulary only", () => {
    expect([...ALLOWED_AUDIENCES].sort()).toEqual(["plugin-author", "user"]);
  });

  test("governance document types are excluded by default", () => {
    expect([...EXCLUDED_DOCUMENT_TYPES].sort()).toEqual([
      "policy",
      "register",
      "research",
      "specification",
    ]);
  });

  test("publishes a reader-facing audience with a non-governance type", () => {
    for (const audience of ALLOWED_AUDIENCES) {
      for (const document_type of [
        "contract",
        "explanation",
        "guide",
        "index",
        "overview",
        "reference",
      ]) {
        expect(
          isPublished(
            metadata({
              sourcePath: "docs/projects/bitty/user-guide/setup.md",
              audience,
              document_type,
            }),
          ),
        ).toBe(true);
      }
    }
  });

  test("does not publish a non reader-facing audience", () => {
    for (const audience of [
      "contributor",
      "maintainer",
      "mixed",
      "security-reviewer",
    ]) {
      expect(
        isPublished(
          metadata({
            sourcePath: "docs/projects/bitty/overview/readme.md",
            audience,
            document_type: "overview",
          }),
        ),
      ).toBe(false);
    }
  });

  test("does not publish a governance document type", () => {
    for (const document_type of EXCLUDED_DOCUMENT_TYPES) {
      expect(
        isPublished(
          metadata({
            sourcePath: "docs/projects/bitty/governance/page.md",
            audience: "user",
            document_type,
          }),
        ),
      ).toBe(false);
    }
  });

  test("never publishes without website_publish: true", () => {
    const decision = decidePublication(
      metadata({
        sourcePath: "docs/projects/bitty/user-guide/setup.md",
        website_publish: false,
      }),
    );
    expect(decision.kind).toBe("exclude");
  });
});

describe("allow-list", () => {
  test("an allow-listed page publishes despite its audience and type", () => {
    for (const entry of allowListEntries()) {
      const published = isPublished(
        metadata({
          sourcePath: entry.path,
          audience: entry.audience,
          document_type: entry.document_type,
        }),
      );
      expect({ path: entry.path, published }).toEqual({
        path: entry.path,
        published: true,
      });
    }
  });

  test("the path set is pinned (shrink-only, reviewed)", () => {
    expect([...allowListEntries()].map((entry) => entry.path).sort()).toEqual([
      ...EXPECTED_ALLOW_LIST_PATHS,
    ]);
  });

  test("every entry records why it is published", () => {
    for (const entry of allowListEntries()) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  test("no governance corpus path may ever be allow-listed", () => {
    const forbidden = [
      "docs/decisions/index.md",
      "docs/decisions/adrs/ADR-0001-repository-bootstrap-baseline.md",
      "docs/decisions/rfcs/RFC-0001-appearance-configuration.md",
      "docs/findings/anything.md",
      "docs/handoff/README.md",
      "docs/reviews/anything.md",
      "docs/sources/anything.md",
      "docs/security/risk-register.md",
      "docs/security/evidence-matrix.md",
      "docs/project/project-state.json",
      "docs/project/technology-strategy.md",
      "docs/development/toolchain-policy.md",
    ];
    for (const path of forbidden) {
      expect({ path, forbidden: isForbiddenAllowListPath(path) }).toEqual({
        path,
        forbidden: true,
      });
    }
    for (const entry of allowListEntries()) {
      expect(isForbiddenAllowListPath(entry.path)).toBe(false);
    }
  });

  test("policy data files declare the policy revision", () => {
    expect(PUBLICATION_POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/u);
  });
});

describe("fail closed", () => {
  test("a violating website_publish: true page aborts the policy", () => {
    const violating = metadata({
      sourcePath: "docs/security/new-governance-page.md",
      audience: "security-reviewer",
      document_type: "policy",
    });
    const report = evaluatePublicationPolicy([...eligibleCorpus(), violating]);
    // The violating page is reported first; the synthetic corpus holds none of
    // the recorded allow-list / flip-list pages, so those files also read as
    // stale here. Both are problems, and the gate refuses the whole corpus.
    expect(report.problems[0]?.kind).toBe("violation");
    expect(report.problems[0]?.detail).toContain(violating.sourcePath);
    expect(() =>
      assertPublicationPolicy([...eligibleCorpus(), violating]),
    ).toThrow(PublicationPolicyError);
  });

  test("a violating page added to the real pinned mirror aborts the gate", async () => {
    const corpus = await readPublicationCorpus(MIRROR_ROOT);
    const violating = metadata({
      sourcePath: "docs/security/new-governance-page.md",
      audience: "security-reviewer",
      document_type: "policy",
    });
    expect(() => assertPublicationPolicy([...corpus, violating])).toThrow(
      /new-governance-page\.md/,
    );
  });

  test("a corpus that leaves the published band aborts the policy", () => {
    const below = evaluatePublicationPolicy([]);
    expect(below.problems.map((problem) => problem.kind)).toContain(
      "published-band",
    );
    const above = evaluatePublicationPolicy(
      eligibleCorpus(PUBLISHED_PAGE_MAX + 1),
    );
    expect(above.problems.map((problem) => problem.kind)).toContain(
      "published-band",
    );
  });

  test("the global band is a coarse sanity bound, not the pre-#98 target", () => {
    // #98 §3.4 / OQ-2 retired the single-source 25-35 target: the operative,
    // attributable gate is the per-source `published.min/max` band in the pin
    // entry. The coarse bound must still admit the migration's smallest
    // legitimate aggregate (21 published after onboarding
    // `bitty-terminal-docs`) and the measured state once `bitty-plugins-docs`
    // lands (47 = bitty-docs 3 + bitty-terminal-docs 18 + bitty-plugins-docs
    // 26), so a shrink or a re-tightening here is a reviewed change.
    expect(PUBLISHED_PAGE_MIN).toBeLessThanOrEqual(21);
    expect(PUBLISHED_PAGE_MAX).toBeGreaterThanOrEqual(47);
  });

  test("a stale allow-list entry aborts the policy", () => {
    const first = allowListEntries()[0];
    if (first === undefined) throw new Error("allow-list is empty");
    const report = evaluatePublicationPolicy([
      ...eligibleCorpus(),
      // The entry's page no longer requests publication.
      metadata({
        sourcePath: first.path,
        audience: first.audience,
        document_type: first.document_type,
        website_publish: false,
      }),
    ]);
    expect(report.problems.map((problem) => problem.kind)).toContain(
      "stale-allow-list",
    );
  });
});

describe("pinned corpus", () => {
  test("the real mirror satisfies the policy", async () => {
    const corpus = await readPublicationCorpus(MIRROR_ROOT);
    const report = assertPublicationPolicy(corpus);
    expect(report.problems).toEqual([]);
    expect(report.published.length).toBeGreaterThanOrEqual(PUBLISHED_PAGE_MIN);
    expect(report.published.length).toBeLessThanOrEqual(PUBLISHED_PAGE_MAX);
    // No governance page is published, and every governance page that still
    // requests publication is a recorded, shrink-only demotion.
    expect(report.demoted.length).toBe(EXPECTED_FLIP_LIST_COUNT);
    expect(report.demoted.length).toBe(flipListEntries().length);
    // Declared-but-ineligible pages ship no route; the count is pinned too.
    expect(report.withheld.length).toBe(withholdListEntries().length);
    expect(report.withheld.length).toBe(EXPECTED_WITHHOLD_COUNT);
  });

  test("the aggregate published count equals the sums of the per-source bands", async () => {
    const pins = parseDocsPinSet(docsRevision);
    const report = evaluatePublicationPolicy(
      await readPublicationCorpus(MIRROR_ROOT),
    );
    const expected = pins.sources.reduce(
      (sum, pin) => sum + pin.published.min,
      0,
    );
    // 3 (bitty-docs) + 18 (bitty-terminal-docs) + 26 (bitty-plugins-docs) = 47
    // after the T6 onboarding. The plan's "44" counts only the three pinned
    // project corpora and omits the 3 governance pages the reduced bitty-docs
    // source still owns (the revision index, the roadmap index, and its
    // remaining published page); the measured aggregate is 47.
    expect(report.published.length).toBe(expected);
    expect(report.published.length).toBe(47);
  });

  test("the flip list is unique and matches the demoted set", async () => {
    const report = assertPublicationPolicy(
      await readPublicationCorpus(MIRROR_ROOT),
    );
    const demoted = report.demoted.map((meta) => meta.sourcePath).sort();
    const listed = [...flipListEntries()].map((entry) => entry.path).sort();
    expect(listed).toEqual(demoted);
    expect(new Set(listed).size).toBe(listed.length);
  });

  test("no demoted page is also allow-listed", () => {
    const allowed = new Set(allowListEntries().map((entry) => entry.path));
    for (const entry of flipListEntries()) {
      expect(allowed.has(entry.path)).toBe(false);
    }
  });
});

describe("policy list source attribution (bitty-website#98)", () => {
  const allEntries = () => [
    ...allowListEntries(),
    ...flipListEntries(),
    ...withholdListEntries(),
  ];

  test("every entry names the pinned source that owns its path", () => {
    const pins = parseDocsPinSet(docsRevision);
    for (const entry of allEntries()) {
      const owner = mountForMirrorPath(entry.path, pins);
      expect({ path: entry.path, owner: owner?.id }).toEqual({
        path: entry.path,
        owner: entry.source,
      });
    }
  });

  test("every entry records a source id, never a repository URL", () => {
    for (const entry of allEntries()) {
      expect(entry.source).toMatch(/^[a-z][a-z0-9-]*$/u);
    }
  });

  test("the allow-list split matches the measured mount ownership", () => {
    const terminal = allowListEntries()
      .filter((entry) => entry.source === "bitty-terminal-docs")
      .map((entry) => entry.path)
      .sort();
    expect(terminal).toEqual([...EXPECTED_ALLOW_LIST_TERMINAL_PATHS].sort());
    // Everything outside `docs/projects/` stays with bitty-docs, including the
    // revision index that owns `/docs/`.
    expect(
      allowListEntries()
        .filter((entry) => entry.source === "bitty-docs")
        .map((entry) => entry.path)
        .sort(),
    ).toEqual(["docs/README.md", "docs/roadmap/README.md"]);
  });
});

describe("withhold list (bitty-website#98)", () => {
  test("the path set is pinned (shrink-only, reviewed)", () => {
    expect(
      [...withholdListEntries()].map((entry) => entry.path).sort(),
    ).toEqual([...EXPECTED_WITHHOLD_PATHS]);
    expect(withholdListEntries().length).toBe(EXPECTED_WITHHOLD_COUNT);
  });

  test("every entry records its owner repository and a reason", () => {
    for (const entry of withholdListEntries()) {
      expect(entry.owner.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  test("a declared-but-ineligible page that is neither allow-listed nor withheld still fails closed", () => {
    const pages = [
      ...eligibleCorpus(),
      // Ineligible (contributor is not a reader-facing audience), not
      // allow-listed and not withheld: it must keep failing exactly as before.
      metadata({
        sourcePath: "docs/projects/bitty/configuration/runbook.md",
        audience: "contributor",
        document_type: "guide",
      }),
    ];
    const report = evaluatePublicationPolicy(pages);
    const violation = report.problems.find(
      (problem) =>
        problem.kind === "violation" &&
        problem.detail.includes("docs/projects/bitty/configuration/runbook.md"),
    );
    expect(violation).toBeDefined();
    expect(() => assertPublicationPolicy(pages)).toThrow(
      PublicationPolicyError,
    );
  });

  test("a withheld page stops failing the build but ships no redirect", async () => {
    const listed = withholdListEntries();
    const withheldRoutes = new Set(
      listed.map(
        (entry) => sourcePathToRouteIdentity(entry.path).routeWithoutVersion,
      ),
    );
    expect(withheldRoutes.size).toBe(EXPECTED_WITHHOLD_COUNT);
    const corpus = await loadPublicationCorpus(MIRROR_ROOT);
    // The withhold list is the *only* reason these pages are tolerated, so the
    // same pages appear in no redirect and in no published route: a withheld
    // page never had a served URL.
    for (const plan of corpus.redirects) {
      expect(withheldRoutes.has(plan.from)).toBe(false);
    }
    for (const route of withheldRoutes) {
      expect(corpus.publishedRoutes).not.toContain(route);
    }
    // Every entry names the corpus that owns the fix.
    for (const entry of listed) {
      if (entry.source === "bitty-terminal-docs") {
        expect(entry.owner).toBe("bitty-core");
      } else if (entry.source === "bitty-plugins-docs") {
        expect(entry.owner).toBe("bitty-plugins");
      } else {
        throw new Error(`unexpected withhold source "${entry.source}"`);
      }
    }
    expect(
      listed.filter((entry) => entry.source === "bitty-plugins-docs").length,
    ).toBe(8);
  });

  test("a withhold entry may not also be allow-listed or demoted", () => {
    const withheld = new Set(withholdListEntries().map((entry) => entry.path));
    for (const entry of [...allowListEntries(), ...flipListEntries()]) {
      expect(withheld.has(entry.path)).toBe(false);
    }
  });
});

describe("contract not implemented", () => {
  test("a specification is a contract", () => {
    expect(
      contractNotImplemented(
        metadata({
          sourcePath: "docs/projects/bitty/specifications/thing.md",
          audience: "plugin-author",
          document_type: "specification",
          status: "draft",
        }),
      ),
    ).toBe(true);
    expect(
      contractNotImplemented(
        metadata({
          sourcePath: "docs/projects/bitty/specifications/thing.md",
          audience: "plugin-author",
          document_type: "specification",
          status: "stable",
        }),
      ),
    ).toBe(false);
  });

  test("a guide is not a contract", () => {
    expect(
      contractNotImplemented(
        metadata({
          sourcePath: "docs/projects/bitty/how-to/thing.md",
          document_type: "guide",
          status: "draft",
        }),
      ),
    ).toBe(false);
  });
});
