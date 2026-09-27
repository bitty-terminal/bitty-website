/**
 * Publication eligibility policy (bitty-website#97).
 *
 * This module is the ONLY definition of what the public site publishes. Three
 * consumers must agree by construction, so they all read this module instead
 * of re-deriving the rule:
 *
 * - the content layer (`./docsEntries.ts`) — sidebar, breadcrumbs, pager;
 * - the docs route page (`../pages/docs/[version]/[...slug].astro`) — the
 *   rendered and static-path set;
 * - the sync/check pipeline (`../../scripts/lib/docs-source.mjs`) — the
 *   `docs:check` staleness gate and the `sync:docs` count it prints.
 *
 * Decisions (owner decision 2026-09-27: "the public site publishes
 * reader-facing documentation only; engineering governance corpora leave the
 * site, they stay canonical in their repositories"):
 *
 * 1. `website_publish: true` is required. Without it a page is never routed.
 * 2. The audience must be one of {@link ALLOWED_AUDIENCES}.
 * 3. The document type must not be one of {@link EXCLUDED_DOCUMENT_TYPES}.
 * 4. A path that fails 2 or 3 is not published, even with
 *    `website_publish: true`, unless it is explicitly allow-listed in
 *    `./publication-allow-list.json` with a reason.
 * 5. Fail closed: `website_publish: true` that satisfies neither the rule, the
 *    allow-list, nor the demotion list below aborts the build and the gate.
 *
 * The pinned mirror is consumed byte-for-byte and its frontmatter is owned by
 * bitty-docs, so the frontmatter flip that removes `website_publish: true` from
 * a demoted page is a coordinated cross-repository change. Until it lands, a
 * demoted page must be recorded in `./publication-flip-list.json` — that file
 * is the docs-side flip list handed to the owning corpus. A page that requests
 * publication without being recorded there fails the build (this is the
 * fail-closed gate), and a recorded page that stops requesting publication
 * fails until the entry is removed, so the list shrinks only with the corpus.
 *
 * Both data files are pinned by `./publicationPolicy.test.ts` (exact path set
 * and count), so adding or removing an entry needs an explicit reviewed edit.
 */

import allowListData from "./publication-allow-list.json" with { type: "json" };
import flipListData from "./publication-flip-list.json" with { type: "json" };

/** Policy revision, bumped whenever the rule, the data files, or a bound moves. */
export const PUBLICATION_POLICY_VERSION = "2026-09-27.1";

/** Date the owner decision behind this policy was recorded. */
export const PUBLICATION_POLICY_DATE = "2026-09-27";

/** Owning issue for the record. */
export const PUBLICATION_POLICY_ISSUE = "bitty-website#97";

/** Audiences a reader-facing page may declare. */
export const ALLOWED_AUDIENCES: readonly string[] = ["plugin-author", "user"];

/** Document types that are governance corpora and default to unpublished. */
export const EXCLUDED_DOCUMENT_TYPES: readonly string[] = [
  "policy",
  "register",
  "research",
  "specification",
];

/**
 * Target size of the published set (website#97: "target 25-35 pages"). The
 * build and the gate fail outside this band so the set cannot drift silently
 * when the pin advances.
 */
export const PUBLISHED_PAGE_MIN = 25;
export const PUBLISHED_PAGE_MAX = 35;

/**
 * Document types that state a contract, and the statuses that mean the
 * contract is implemented. The page badge derives "contract not implemented"
 * from frontmatter metadata only — never from corpus prose — so the badge is
 * deterministic and stays correct while the docs-side prose rewrite is pending.
 */
export const CONTRACT_DOCUMENT_TYPES: readonly string[] = [
  "contract",
  "specification",
];
export const IMPLEMENTED_STATUSES: readonly string[] = ["stable"];

/**
 * Governance corpora that may never be allow-listed (website#97 names these as
 * leaving the site, and the task that owns this policy repeats them as a hard
 * limit). Enforced here and pinned by the policy test.
 */
export const FORBIDDEN_ALLOW_LIST_PREFIXES: readonly string[] = [
  "docs/decisions/", // decision register: ADRs, RFCs, open questions
  "docs/findings/", // findings corpus
  "docs/handoff/", // handoff corpus
  "docs/reviews/", // review corpus
  "docs/sources/", // sources / provenance ledgers
  "docs/security/risk-register.md",
  "docs/security/evidence-matrix.md",
  "docs/project/project-state.json",
];

/** Development process pages and project governance pages, by prefix. */
export const FORBIDDEN_ALLOW_LIST_ALSO: readonly string[] = [
  "docs/development/",
  "docs/project/",
];

/** A `docs/...md` source path plus the frontmatter fields the policy reads. */
export type PublicationMetadata = {
  /** Repo-relative path, e.g. `docs/projects/bitty/product/vision.md`. */
  readonly sourcePath: string;
  readonly audience: string;
  readonly document_type: string;
  readonly website_publish: boolean;
  /** Frontmatter `status`, used by the page badge only. */
  readonly status?: string;
};

export type PublicationDecisionKind =
  "publish" | "demote" | "exclude" | "violation";

export type PublicationDecision = {
  readonly kind: PublicationDecisionKind;
  readonly sourcePath: string;
  /** Human-readable justification, logged by the gate and the build. */
  readonly reason: string;
};

/** One entry of `./publication-allow-list.json` or the flip list. */
export type PolicyListEntry = {
  readonly path: string;
  readonly audience: string;
  readonly document_type: string;
  readonly reason: string;
};

type AllowListEntry = PolicyListEntry;
type FlipListEntry = PolicyListEntry;

type PolicyDataFile = {
  readonly policy_version: string;
  readonly entries: readonly AllowListEntry[];
};

function policyEntries(
  data: PolicyDataFile,
  fileName: string,
): readonly AllowListEntry[] {
  if (data.policy_version !== PUBLICATION_POLICY_VERSION) {
    throw new Error(
      `${fileName} declares policy_version ${data.policy_version} but the policy module is ${PUBLICATION_POLICY_VERSION}; bump both together`,
    );
  }
  return data.entries;
}

const ALLOW_LIST: readonly AllowListEntry[] = policyEntries(
  allowListData as PolicyDataFile,
  "publication-allow-list.json",
);
const FLIP_LIST: readonly FlipListEntry[] = policyEntries(
  flipListData as PolicyDataFile,
  "publication-flip-list.json",
);

const ALLOW_BY_PATH = new Map(ALLOW_LIST.map((entry) => [entry.path, entry]));
const FLIP_BY_PATH = new Map(FLIP_LIST.map((entry) => [entry.path, entry]));

/** Allow-list entries, for the pinning test and reviewers. */
export function allowListEntries(): readonly AllowListEntry[] {
  return ALLOW_LIST;
}

/** Demotion (docs-side flip) entries, for the pinning test and reviewers. */
export function flipListEntries(): readonly FlipListEntry[] {
  return FLIP_LIST;
}

export function allowListEntryFor(
  sourcePath: string,
): AllowListEntry | undefined {
  return ALLOW_BY_PATH.get(sourcePath);
}

export function flipListEntryFor(
  sourcePath: string,
): FlipListEntry | undefined {
  return FLIP_BY_PATH.get(sourcePath);
}

/**
 * `true` when a governance corpus that may never be allow-listed.
 *
 * @throws never — the caller decides; {@link assertPublicationPolicy} fails
 *   closed, and the policy test pins the named corpora.
 */
export function isForbiddenAllowListPath(sourcePath: string): boolean {
  return [...FORBIDDEN_ALLOW_LIST_PREFIXES, ...FORBIDDEN_ALLOW_LIST_ALSO].some(
    (forbidden) =>
      forbidden.endsWith("/")
        ? sourcePath.startsWith(forbidden)
        : sourcePath === forbidden,
  );
}

/** Rule 2 + 3, without the allow-list. */
export function meetsEligibilityRule(meta: PublicationMetadata): boolean {
  return (
    ALLOWED_AUDIENCES.includes(meta.audience) &&
    !EXCLUDED_DOCUMENT_TYPES.includes(meta.document_type)
  );
}

/**
 * Classify one page. Never throws: the caller aggregates decisions so every
 * problem in a build is reported at once (see {@link assertPublicationPolicy}).
 */
export function decidePublication(
  meta: PublicationMetadata,
): PublicationDecision {
  const { sourcePath } = meta;
  if (meta.website_publish !== true) {
    return {
      kind: "exclude",
      sourcePath,
      reason: "frontmatter does not request publication",
    };
  }
  if (meetsEligibilityRule(meta)) {
    return {
      kind: "publish",
      sourcePath,
      reason: `publication policy: audience ${meta.audience} with document_type ${meta.document_type}`,
    };
  }
  const allowed = ALLOW_BY_PATH.get(sourcePath);
  if (allowed !== undefined) {
    return {
      kind: "publish",
      sourcePath,
      reason: `allow-listed (audience ${meta.audience}, document_type ${meta.document_type}): ${allowed.reason}`,
    };
  }
  const flip = FLIP_BY_PATH.get(sourcePath);
  if (flip !== undefined) {
    return {
      kind: "demote",
      sourcePath,
      reason: `demoted pending the docs-side frontmatter flip: ${flip.reason}`,
    };
  }
  return {
    kind: "violation",
    sourcePath,
    reason: `website_publish: true is not valid for audience ${meta.audience} and document_type ${meta.document_type}, and the path is not allow-listed (publication policy ${PUBLICATION_POLICY_VERSION}, ${PUBLICATION_POLICY_ISSUE})`,
  };
}

/** `true` when the page is part of the published set. */
export function isPublished(meta: PublicationMetadata): boolean {
  return decidePublication(meta).kind === "publish";
}

/**
 * `true` when frontmatter metadata states a contract that is not implemented.
 * Metadata-derived on purpose: the badge must not read corpus prose, and the
 * corpus paragraph rewrite is a recorded cross-repository follow-up.
 */
export function contractNotImplemented(meta: PublicationMetadata): boolean {
  if (!CONTRACT_DOCUMENT_TYPES.includes(meta.document_type)) return false;
  return !IMPLEMENTED_STATUSES.includes(meta.status ?? "");
}

export type PublicationPolicyProblem = {
  readonly kind:
    | "violation"
    | "stale-allow-list"
    | "stale-flip-list"
    | "forbidden-allow-list"
    | "policy-version"
    | "published-band";
  readonly detail: string;
};

export type PublicationPolicyReport = {
  readonly published: readonly PublicationMetadata[];
  readonly demoted: readonly PublicationMetadata[];
  readonly excluded: readonly PublicationMetadata[];
  readonly problems: readonly PublicationPolicyProblem[];
};

/**
 * Evaluate a whole corpus. Pure: returns counts plus every problem found, so
 * callers decide how to report (the gate fails on any problem).
 */
export function evaluatePublicationPolicy(
  metadatas: readonly PublicationMetadata[],
): PublicationPolicyReport {
  const problems: PublicationPolicyProblem[] = [];
  const published: PublicationMetadata[] = [];
  const demoted: PublicationMetadata[] = [];
  const excluded: PublicationMetadata[] = [];
  const seen = new Map<string, PublicationMetadata>();

  for (const meta of metadatas) {
    if (seen.has(meta.sourcePath)) {
      problems.push({
        kind: "violation",
        detail: `duplicate corpus path in the policy evaluation: ${meta.sourcePath}`,
      });
      continue;
    }
    seen.set(meta.sourcePath, meta);
    const decision = decidePublication(meta);
    if (decision.kind === "publish") published.push(meta);
    else if (decision.kind === "demote") demoted.push(meta);
    else if (decision.kind === "exclude") excluded.push(meta);
    else {
      problems.push({
        kind: "violation",
        detail: `${decision.sourcePath}: ${decision.reason}`,
      });
    }
  }

  // Both data files may only shrink with the corpus: an entry that no longer
  // matches a page requesting publication is stale and must be removed in the
  // same change that flips the corpus.
  const checkList = (
    entries: readonly AllowListEntry[],
    kind: "stale-allow-list" | "stale-flip-list",
    file: string,
  ) => {
    for (const entry of entries) {
      const meta = seen.get(entry.path);
      if (meta === undefined) {
        problems.push({
          kind,
          detail: `${file} lists ${entry.path}, which is not in the corpus at this revision`,
        });
        continue;
      }
      if (meta.website_publish !== true) {
        problems.push({
          kind,
          detail: `${file} lists ${entry.path}, which no longer sets website_publish: true; remove the entry`,
        });
        continue;
      }
      if (meta.audience !== entry.audience) {
        problems.push({
          kind,
          detail: `${file} records audience ${entry.audience} for ${entry.path}, but the corpus says ${meta.audience}`,
        });
      }
      if (meta.document_type !== entry.document_type) {
        problems.push({
          kind,
          detail: `${file} records document_type ${entry.document_type} for ${entry.path}, but the corpus says ${meta.document_type}`,
        });
      }
    }
  };
  checkList(ALLOW_LIST, "stale-allow-list", "publication-allow-list.json");
  checkList(FLIP_LIST, "stale-flip-list", "publication-flip-list.json");

  for (const entry of ALLOW_LIST) {
    if (FLIP_BY_PATH.has(entry.path)) {
      problems.push({
        kind: "violation",
        detail: `${entry.path} is both allow-listed and demoted`,
      });
    }
    if (isForbiddenAllowListPath(entry.path)) {
      problems.push({
        kind: "forbidden-allow-list",
        detail: `${entry.path} is a governance corpus path (${PUBLICATION_POLICY_ISSUE}) and may never be allow-listed`,
      });
    }
  }

  if (
    published.length < PUBLISHED_PAGE_MIN ||
    published.length > PUBLISHED_PAGE_MAX
  ) {
    problems.push({
      kind: "published-band",
      detail: `published set has ${published.length} page(s), outside the ${PUBLISHED_PAGE_MIN}-${PUBLISHED_PAGE_MAX} target of ${PUBLICATION_POLICY_ISSUE} (policy ${PUBLICATION_POLICY_VERSION}, ${PUBLICATION_POLICY_DATE})`,
    });
  }

  return { published, demoted, excluded, problems };
}

/** Error thrown by {@link assertPublicationPolicy}, listing every problem. */
export class PublicationPolicyError extends Error {
  readonly problems: readonly PublicationPolicyProblem[];

  constructor(problems: readonly PublicationPolicyProblem[]) {
    super(
      [
        `publication policy ${PUBLICATION_POLICY_VERSION} (${PUBLICATION_POLICY_ISSUE}) rejected the corpus:`,
        ...problems.map((problem) => `  - ${problem.kind}: ${problem.detail}`),
      ].join("\n"),
    );
    this.name = "PublicationPolicyError";
    this.problems = problems;
  }
}

/**
 * Fail-closed gate over a whole corpus. Throws
 * {@link PublicationPolicyError} when any page requests publication without
 * being eligible, allow-listed, or recorded as pending the docs-side flip,
 * when either data file is stale, or when the published set leaves its band.
 *
 * Called by the docs route page (build) and by the sync/check pipeline, so a
 * build and the gate describe the same set.
 */
export function assertPublicationPolicy(
  metadatas: readonly PublicationMetadata[],
): PublicationPolicyReport {
  const report = evaluatePublicationPolicy(metadatas);
  if (report.problems.length > 0) {
    throw new PublicationPolicyError(report.problems);
  }
  return report;
}
