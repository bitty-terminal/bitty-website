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
 *
 * Multi-source aggregation (bitty-website#98) makes the lists source-aware:
 * every entry records the pinned `source` that owns its path, and a third
 * shrink-only file — `./publication-withhold-list.json` — records the
 * declared-but-ineligible pages with the corpus `owner` that must fix them.
 * A withheld page ships no route (it never had one), unlike a flip-listed
 * demotion, which ships a 301 because it was published once.
 */

import allowListData from "./publication-allow-list.json" with { type: "json" };
import flipListData from "./publication-flip-list.json" with { type: "json" };
import withholdListData from "./publication-withhold-list.json" with { type: "json" };

/** Policy revision, bumped whenever the rule, the data files, or a bound moves. */
export const PUBLICATION_POLICY_VERSION = "2026-09-28.4";

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
 * Type/audience pairs where the type exclusion must not also exclude the
 * audience's own reader-facing documentation.
 *
 * Owner decision on issue #97 (2026-09-27): a `specification` whose audience is
 * `plugin-author` IS reader-facing — it is the plugin API surface that audience
 * is published for — so it is published by rule rather than by a per-path
 * allow-list entry. The exclusion still fails closed for every other audience
 * (`contributor`, `maintainer`, `security-reviewer`, `mixed`), and `register`,
 * `policy` and `research` have no exception at all.
 */
export const TYPE_AUDIENCE_EXCEPTIONS: readonly {
  readonly document_type: string;
  readonly audience: string;
  readonly reason: string;
}[] = [
  {
    document_type: "specification",
    audience: "plugin-author",
    reason:
      "plugin-author specification: the audience's own API surface (owner decision, issue #97)",
  },
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
 * Governance corpora that are never published (website#97 names these as leaving
 * the site) and may never be allow-listed.
 *
 * The check runs on EVERY publish decision — the eligibility rule, including
 * `TYPE_AUDIENCE_EXCEPTIONS`, and the allow-list are both subordinate to it —
 * so no door into the published set bypasses it. An earlier revision applied it
 * only to allow-list entries, which let two decision records through by rule.
 */
export const FORBIDDEN_PUBLICATION_PREFIXES: readonly string[] = [
  "docs/decisions/", // decision register: ADRs, RFCs, open questions
  "docs/development/", // development process pages
  "docs/findings/", // findings corpus
  "docs/handoff/", // handoff corpus
  "docs/project/", // project state and project governance pages
  "docs/provenance/", // sources and provenance ledgers
  "docs/reviews/", // review corpus
  "docs/security/", // risk register, evidence matrix, threat model, P0 criteria
  "docs/sources/", // sources and provenance ledgers
];

/** Kept for the existing call sites and tests; the same list. */
export const FORBIDDEN_ALLOW_LIST_PREFIXES: readonly string[] =
  FORBIDDEN_PUBLICATION_PREFIXES;

/** Folded into {@link FORBIDDEN_PUBLICATION_PREFIXES}; kept exported. */
export const FORBIDDEN_ALLOW_LIST_ALSO: readonly string[] = [];

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
  "publish" | "demote" | "withhold" | "exclude" | "violation";

export type PublicationDecision = {
  readonly kind: PublicationDecisionKind;
  readonly sourcePath: string;
  /** Human-readable justification, logged by the gate and the build. */
  readonly reason: string;
};

/**
 * One entry of `./publication-allow-list.json`, the flip list, or the withhold
 * list.
 *
 * `source` attributes the entry to the pinned source that owns `path`
 * (`src/content/docs-revision.json`); `owner` names the corpus repository that
 * owns the fix and is required on withhold entries. Both are cross-checked
 * against the pin set by `./publicationPolicy.test.ts`, so attribution cannot
 * drift from the mounts.
 */
export type PolicyListEntry = {
  /** Pinned source id that owns `path` (bitty-website#98). */
  readonly source: string;
  readonly path: string;
  readonly audience: string;
  readonly document_type: string;
  readonly reason: string;
  /** Corpus repository that owns the fix (withhold entries only). */
  readonly owner?: string;
};

type AllowListEntry = PolicyListEntry;
type FlipListEntry = PolicyListEntry;
/** A declared-but-ineligible page: `{source, path, audience, document_type, owner, reason}`. */
export type WithholdListEntry = PolicyListEntry & { readonly owner: string };

/** Fields every policy-list entry must carry. */
const REQUIRED_ENTRY_FIELDS = [
  "source",
  "path",
  "audience",
  "document_type",
  "reason",
] as const;

function parsePolicyEntries(
  entries: unknown,
  fileName: string,
): readonly PolicyListEntry[] {
  if (!Array.isArray(entries)) {
    throw new Error(`${fileName} entries must be an array`);
  }
  return entries.map((raw, index) => {
    const what = `${fileName} entries[${index}]`;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`${what} must be a JSON object`);
    }
    const record = raw as Record<string, unknown>;
    for (const field of REQUIRED_ENTRY_FIELDS) {
      const value = record[field];
      if (typeof value !== "string" || value.length === 0) {
        throw new Error(`${what}.${field} must be a non-empty string`);
      }
    }
    if (record.owner !== undefined && typeof record.owner !== "string") {
      throw new Error(`${what}.owner must be a string when present`);
    }
    return {
      source: record.source as string,
      path: record.path as string,
      audience: record.audience as string,
      document_type: record.document_type as string,
      reason: record.reason as string,
      ...(record.owner === undefined ? {} : { owner: record.owner as string }),
    };
  });
}

/** Parse and version-check one policy data file's entry list. */
function policyEntries(
  data: unknown,
  fileName: string,
): readonly PolicyListEntry[] {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${fileName} must be a JSON object`);
  }
  const record = data as Record<string, unknown>;
  if (record.policy_version !== PUBLICATION_POLICY_VERSION) {
    throw new Error(
      `${fileName} declares policy_version ${record.policy_version} but the policy module is ${PUBLICATION_POLICY_VERSION}; bump both together`,
    );
  }
  return parsePolicyEntries(record.entries, fileName);
}

/** Parse the withhold list, which requires an `owner` on every entry. */
function withholdEntries(
  data: unknown,
  fileName: string,
): readonly WithholdListEntry[] {
  return policyEntries(data, fileName).map((entry, index) => {
    if (entry.owner === undefined || entry.owner.length === 0) {
      throw new Error(
        `${fileName} entries[${index}] must record an owner repository (bitty-website#98)`,
      );
    }
    return {
      source: entry.source,
      path: entry.path,
      audience: entry.audience,
      document_type: entry.document_type,
      reason: entry.reason,
      owner: entry.owner,
    };
  });
}

const ALLOW_LIST: readonly AllowListEntry[] = policyEntries(
  allowListData,
  "publication-allow-list.json",
);
const FLIP_LIST: readonly FlipListEntry[] = policyEntries(
  flipListData,
  "publication-flip-list.json",
);
/**
 * Declared-but-ineligible pages: `website_publish: true` under the unchanged
 * #97 rule, ineligible and not allow-listed. They never had a published route,
 * so they ship no redirect; a declared page that is ineligible and listed in
 * neither list keeps failing the build. Count-pinned, shrink-only.
 */
const WITHHOLD_LIST: readonly WithholdListEntry[] = withholdEntries(
  withholdListData,
  "publication-withhold-list.json",
);

const ALLOW_BY_PATH = new Map(ALLOW_LIST.map((entry) => [entry.path, entry]));
const FLIP_BY_PATH = new Map(FLIP_LIST.map((entry) => [entry.path, entry]));
const WITHHOLD_BY_PATH = new Map(
  WITHHOLD_LIST.map((entry) => [entry.path, entry]),
);

/** Allow-list entries, for the pinning test and reviewers. */
export function allowListEntries(): readonly AllowListEntry[] {
  return ALLOW_LIST;
}

/** Demotion (docs-side flip) entries, for the pinning test and reviewers. */
export function flipListEntries(): readonly FlipListEntry[] {
  return FLIP_LIST;
}

/** Declared-but-ineligible entries, for the pinning test and reviewers. */
export function withholdListEntries(): readonly WithholdListEntry[] {
  return WITHHOLD_LIST;
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

export function withholdListEntryFor(
  sourcePath: string,
): WithholdListEntry | undefined {
  return WITHHOLD_BY_PATH.get(sourcePath);
}

/**
 * `true` when the path belongs to a governance corpus that is never published
 * and may never be allow-listed.
 *
 * Consulted by {@link decidePublication} for every publish decision and by
 * {@link evaluatePublicationPolicy} for allow-list entries.
 */
export function isForbiddenPublicationPath(sourcePath: string): boolean {
  return FORBIDDEN_PUBLICATION_PREFIXES.some((forbidden) =>
    forbidden.endsWith("/")
      ? sourcePath.startsWith(forbidden)
      : sourcePath === forbidden,
  );
}

/** Earlier name of {@link isForbiddenPublicationPath}; kept for call sites. */
export const isForbiddenAllowListPath = isForbiddenPublicationPath;

/** Document types that are governance corpora and may never enter the allow-list. */
export const GOVERNANCE_DOCUMENT_TYPES: readonly string[] = [
  "policy",
  "register",
  "research",
];

/**
 * `true` when an allow-list entry would smuggle in a governance page: a
 * governance path ({@link isForbiddenPublicationPath}) or a governance
 * document type.
 */
export function isForbiddenAllowListEntry(entry: {
  readonly path: string;
  readonly document_type: string;
}): boolean {
  return (
    isForbiddenPublicationPath(entry.path) ||
    GOVERNANCE_DOCUMENT_TYPES.includes(entry.document_type)
  );
}

/** Rule 2 + 3, without the allow-list. */
export function meetsEligibilityRule(meta: PublicationMetadata): boolean {
  if (!ALLOWED_AUDIENCES.includes(meta.audience)) return false;
  if (!EXCLUDED_DOCUMENT_TYPES.includes(meta.document_type)) return true;
  return TYPE_AUDIENCE_EXCEPTIONS.some(
    (exception) =>
      exception.document_type === meta.document_type &&
      exception.audience === meta.audience,
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
  if (isForbiddenPublicationPath(sourcePath)) {
    const pendingFlip = FLIP_BY_PATH.get(sourcePath);
    if (pendingFlip !== undefined) {
      return {
        kind: "demote",
        sourcePath,
        reason: `governance corpus path is never published: ${pendingFlip.reason}`,
      };
    }
    return {
      kind: "violation",
      sourcePath,
      reason: `governance corpus path must not request publication (publication policy ${PUBLICATION_POLICY_VERSION}, ${PUBLICATION_POLICY_ISSUE})`,
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
  const withheld = WITHHOLD_BY_PATH.get(sourcePath);
  if (withheld !== undefined) {
    return {
      kind: "withhold",
      sourcePath,
      reason: `withheld for ${withheld.owner} (${withheld.source}): ${withheld.reason}`,
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
    | "stale-withhold-list"
    | "forbidden-allow-list"
    | "policy-version"
    | "published-band";
  readonly detail: string;
};

export type PublicationPolicyReport = {
  readonly published: readonly PublicationMetadata[];
  readonly demoted: readonly PublicationMetadata[];
  /** Declared-but-ineligible pages (they never had a route, so no 301). */
  readonly withheld: readonly PublicationMetadata[];
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
  const withheld: PublicationMetadata[] = [];
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
    else if (decision.kind === "withhold") withheld.push(meta);
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

  // The withhold list may only shrink with the corpus too (bitty-website#98):
  // an entry whose page is gone, unpublished, or now eligible / allow-listed /
  // demoted must be removed in the same change, so a withheld page cannot stay
  // silently withheld after the corpus fixed it.
  for (const entry of WITHHOLD_LIST) {
    const meta = seen.get(entry.path);
    if (meta === undefined) {
      problems.push({
        kind: "stale-withhold-list",
        detail: `publication-withhold-list.json lists ${entry.path}, which is not in the corpus at this revision`,
      });
      continue;
    }
    if (meta.website_publish !== true) {
      problems.push({
        kind: "stale-withhold-list",
        detail: `publication-withhold-list.json lists ${entry.path}, which no longer sets website_publish: true; remove the entry`,
      });
      continue;
    }
    if (meta.audience !== entry.audience) {
      problems.push({
        kind: "stale-withhold-list",
        detail: `publication-withhold-list.json records audience ${entry.audience} for ${entry.path}, but the corpus says ${meta.audience}`,
      });
    }
    if (meta.document_type !== entry.document_type) {
      problems.push({
        kind: "stale-withhold-list",
        detail: `publication-withhold-list.json records document_type ${entry.document_type} for ${entry.path}, but the corpus says ${meta.document_type}`,
      });
    }
    const decision = decidePublication(meta);
    if (decision.kind !== "withhold") {
      problems.push({
        kind: "stale-withhold-list",
        detail: `publication-withhold-list.json lists ${entry.path}, which is now ${decision.kind}; remove the entry`,
      });
    }
  }

  for (const entry of WITHHOLD_LIST) {
    if (FLIP_BY_PATH.has(entry.path)) {
      problems.push({
        kind: "violation",
        detail: `${entry.path} is both withheld and demoted`,
      });
    }
    if (ALLOW_BY_PATH.has(entry.path)) {
      problems.push({
        kind: "violation",
        detail: `${entry.path} is both withheld and allow-listed`,
      });
    }
  }

  for (const entry of ALLOW_LIST) {
    if (FLIP_BY_PATH.has(entry.path)) {
      problems.push({
        kind: "violation",
        detail: `${entry.path} is both allow-listed and demoted`,
      });
    }
    if (isForbiddenAllowListEntry(entry)) {
      const why = isForbiddenPublicationPath(entry.path)
        ? `${entry.path} is a governance corpus path (${PUBLICATION_POLICY_ISSUE})`
        : `${entry.path} carries document_type ${entry.document_type}, which is a governance type`;
      problems.push({
        kind: "forbidden-allow-list",
        detail: `${why} and may never be allow-listed`,
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

  return { published, demoted, withheld, excluded, problems };
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
