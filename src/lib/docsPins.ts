/**
 * Pinned documentation sources and the aggregate mirror layout
 * (bitty-website#98, multi-source docs aggregation).
 *
 * This module is the single schema and mount→mirror-path authority for the two
 * generated artifacts the sync pipeline writes:
 *
 * - `src/content/docs-revision.json` — the pins, schema 2: one entry per
 *   consumed documentation source (bitty-docs plus each project corpus).
 * - `src/content/docs-manifest.json` — the provenance record, schema 2: one
 *   entry per source with its parity results, counts, per-file SHA-256 and the
 *   published routes it contributes.
 *
 * Both the sync/check scripts (`scripts/lib/docs-source.mjs`,
 * `scripts/sync-docs.mjs`, `scripts/check-docs-sync.mjs`) and the build
 * (`src/lib/docsValidation.ts`, `astro.config.mjs`, `scripts/validate-dist.mjs`)
 * read this module, so the schema the sync writes and the schema the build
 * accepts cannot drift by construction.
 *
 * The module is pure: no filesystem, no network, no Astro imports. Callers
 * walk the materialized snapshots and hand the resulting source-relative paths
 * to {@link selectConsumedPaths}, which is the only place the consumed-file
 * selector is defined.
 */

/** Schema revision of `src/content/docs-revision.json`. */
export const DOCS_PIN_SCHEMA = 2;

/** Schema revision of `src/content/docs-manifest.json`. */
export const DOCS_MANIFEST_SCHEMA = 2;

/** Repository-relative pin file path (also used in messages). */
export const DOCS_PIN_FILE = "src/content/docs-revision.json";

/** Repository-relative provenance manifest path (also used in messages). */
export const DOCS_MANIFEST_FILE = "src/content/docs-manifest.json";

/** Mirror-relative directory the aggregate corpus is materialized under. */
export const MIRROR_DOCS_DIR = "docs";

/** Mirror-relative path of the revision index; exactly one source owns it. */
export const REVISION_INDEX_MIRROR_PATH = `${MIRROR_DOCS_DIR}/README.md`;

/**
 * Source-relative path of the revision index inside a docs corpus.
 *
 * Every corpus keeps its documentation map at `docs/README.md` (the
 * bitty-terminal-docs layout), which is why the canonical mount (`docs` → ``)
 * also reproduces the mirror's own revision-index path.
 */
export const REVISION_INDEX_SOURCE_PATH = `${MIRROR_DOCS_DIR}/README.md`;

/**
 * Rejection message for the pre-#98 flat pin shape. The migration is a
 * `just docs-sync` run in the same commit as the schema change, so the message
 * names the command rather than the code that would have to change.
 */
export const LEGACY_PIN_MIGRATION_MESSAGE =
  "legacy single-source pin: run 'just docs-sync' to migrate to schema 2 (bitty-website#98)";

/** Full lowercase 40-character commit SHA. */
export const SHA40 = /^[0-9a-f]{40}$/;

/** Branch names that must never be pinned (SY-3). */
export const FLOATING_BRANCHES: ReadonlySet<string> = new Set([
  "main",
  "master",
  "develop",
  "dev",
  "latest",
  "next",
]);

const TAG_LIKE = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/**
 * Source slug syntax a pin entry accepts (`host/owner/repo`). Exported so the
 * sync scripts read the slug rule from this module instead of re-declaring it
 * (single schema authority, bitty-website#98 review).
 */
export const SOURCE_SLUG = /^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const SOURCE_ID = /^[a-z][a-z0-9-]*$/;
const TO_PATH = /^[a-z][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
const FROM_PATH = /^(?:\.|[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)$/;

/**
 * Top-level directory names that are repository metadata, never consumed when
 * a mount points at a repository root. Dot-prefixed entries are covered by the
 * generic dot rule; the named list is explicit so a reviewer can see the
 * carve-out without reading the selector body.
 */
export const RESERVED_REPO_ROOT_ENTRIES: readonly string[] = [
  ".github",
  ".carryctx",
  ".worktrees",
  ".git",
  "scripts",
  "docs",
];

/** Error thrown for every pin/manifest schema or mount problem. */
export class DocsPinsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocsPinsError";
  }
}

/** One `from`→`to` mount of a source into the aggregate mirror. */
export type DocsMount = {
  /** Source-relative directory (`.` for the repository root, else a path). */
  readonly from: string;
  /** Mirror-relative directory under `docs/` (`""` for the mirror root). */
  readonly to: string;
};

/** Per-source published-page band recorded in the pin entry (reviewed data). */
export type PublishedBand = {
  readonly min: number;
  readonly max: number;
};

/** One pinned documentation source. */
export type DocsSourcePin = {
  readonly id: string;
  readonly source: string;
  readonly revision: string;
  readonly synced_at: string;
  readonly mounts: readonly DocsMount[];
  /** Reviewed include carve-outs (source-relative paths). */
  readonly include?: readonly string[];
  /** Reviewed exclude carve-outs (source-relative paths). */
  readonly exclude?: readonly string[];
  readonly published: PublishedBand;
};

/** The parsed `src/content/docs-revision.json` (schema 2). */
export type DocsPinSet = {
  readonly schema: typeof DOCS_PIN_SCHEMA;
  readonly sources: readonly DocsSourcePin[];
};

/** Per-mode parity result recorded in the manifest. */
export type DocsParityResult = "pass" | "fail";

/** Per-mode parity results of one source (the four canonical gates). */
export type DocsParityReport = {
  readonly metadata: DocsParityResult;
  readonly language: DocsParityResult;
  readonly links: DocsParityResult;
  readonly hygiene: DocsParityResult;
};

/** Counts a source contributes to the aggregate mirror. */
export type DocsSourceCounts = {
  readonly files: number;
  readonly pages: number;
  readonly published: number;
  readonly demoted: number;
  readonly withheld: number;
  readonly excluded: number;
};

/** One source entry of `src/content/docs-manifest.json`. */
export type DocsManifestSource = {
  readonly id: string;
  readonly source: string;
  readonly revision: string;
  readonly mounts: readonly DocsMount[];
  readonly parity: DocsParityReport;
  readonly counts: DocsSourceCounts;
  /** Mirror-relative path → lowercase SHA-256 of the bytes at the pin. */
  readonly files: Readonly<Record<string, string>>;
  /** Version-less `/docs/.../` routes this source publishes. */
  readonly published_routes: readonly string[];
};

/** The parsed `src/content/docs-manifest.json` (schema 2). */
export type DocsManifest = {
  readonly schema: typeof DOCS_MANIFEST_SCHEMA;
  readonly sources: readonly DocsManifestSource[];
};

/** A per-source gate failure, collected rather than thrown on first sight. */
export type SourceFailure = {
  readonly source: string;
  readonly message: string;
};

/**
 * Aggregate failure: names every failing source at once. The check pipeline
 * collects all failures so a reviewer who fixes one source cannot believe the
 * rest of the corpora are clean.
 */
export class DocsSourceFailuresError extends Error {
  readonly failures: readonly SourceFailure[];

  constructor(failures: readonly SourceFailure[]) {
    super(
      [
        `docs source gate(s) failed (${failures.length} source(s)):`,
        ...failures.map(
          (failure) => `  - ${failure.source}: ${failure.message}`,
        ),
      ].join("\n"),
    );
    this.name = "DocsSourceFailuresError";
    this.failures = failures;
  }
}

/** Throw {@link DocsSourceFailuresError} when any source failed. */
export function assertNoSourceFailures(
  failures: readonly SourceFailure[],
): void {
  if (failures.length > 0) throw new DocsSourceFailuresError(failures);
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DocsPinsError(`${what} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function assertKnownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  what: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      throw new DocsPinsError(`${what} has unknown key "${key}"`);
    }
  }
}

/**
 * `true` when `value` is the pre-#98 flat pin `{revision, source, synced_at}`.
 *
 * Exported because `scripts/lib/docs-source.mjs` and `scripts/sync-docs.mjs`
 * must answer the same question with the same rule; the legacy detector is a
 * schema decision and therefore belongs to this module, not a copy.
 */
export function isLegacyPin(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if ("schema" in record || "sources" in record) return false;
  const keys = Object.keys(record);
  if (keys.length === 0) return false;
  return keys.every((key) => ["revision", "source", "synced_at"].includes(key));
}

/**
 * Pin syntax check (SY-2/SY-3): a full lowercase 40-char SHA or an immutable
 * tag; floating branches and short/mixed-case SHAs are rejected. Returns a
 * message describing the problem, or `null` when the revision is valid.
 */
export function validatePinFormat(revision: string): string | null {
  if (FLOATING_BRANCHES.has(revision)) {
    return `pin must not be a floating branch: "${revision}" (SY-3)`;
  }
  if (SHA40.test(revision)) return null;
  if (/^[0-9a-f]{4,39}$/.test(revision) || /^[0-9a-fA-F]{40}$/.test(revision)) {
    return `pin must be a full lowercase 40-char SHA, not a short or mixed-case SHA: "${revision}" (SY-2)`;
  }
  if (!TAG_LIKE.test(revision)) {
    return `pin "${revision}" is not a 40-char SHA or an immutable tag (SY-3)`;
  }
  return null;
}

/** {@link validatePinFormat} as a throwing assertion. */
export function assertPinFormat(revision: string): void {
  const problem = validatePinFormat(revision);
  if (problem !== null) throw new DocsPinsError(problem);
}

function parseMount(value: unknown, what: string): DocsMount {
  const record = asRecord(value, what);
  assertKnownKeys(record, ["from", "to"], what);
  if (typeof record.from !== "string" || !FROM_PATH.test(record.from)) {
    throw new DocsPinsError(
      `${what}.from must be "." or a source-relative path: ${JSON.stringify(record.from)}`,
    );
  }
  if (
    typeof record.to !== "string" ||
    (record.to !== "" && !TO_PATH.test(record.to))
  ) {
    throw new DocsPinsError(
      `${what}.to must be "" or a mirror-relative path: ${JSON.stringify(record.to)}`,
    );
  }
  return { from: record.from, to: record.to };
}

function parseIncludeList(value: unknown, what: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new DocsPinsError(
      `${what} must be an array of source-relative paths`,
    );
  }
  const entries: string[] = [];
  for (const entry of value) {
    const normalized =
      typeof entry === "string" ? stripTrailingSlash(entry) : "";
    if (
      normalized.length === 0 ||
      normalized === "." ||
      !FROM_PATH.test(normalized)
    ) {
      throw new DocsPinsError(
        `${what} entries must be source-relative paths: ${JSON.stringify(entry)}`,
      );
    }
    entries.push(normalized);
  }
  return entries.sort();
}

function parseBand(value: unknown, what: string): PublishedBand {
  const record = asRecord(value, what);
  assertKnownKeys(record, ["min", "max"], what);
  const { min, max } = record;
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    (min as number) < 0 ||
    (max as number) < 0
  ) {
    throw new DocsPinsError(`${what}.min/max must be non-negative integers`);
  }
  if ((min as number) > (max as number)) {
    throw new DocsPinsError(
      `${what}.min (${String(min)}) must not exceed .max (${String(max)})`,
    );
  }
  return { min: min as number, max: max as number };
}

function parseSourcePin(value: unknown, index: number): DocsSourcePin {
  const what = `${DOCS_PIN_FILE} sources[${index}]`;
  const record = asRecord(value, what);
  assertKnownKeys(
    record,
    [
      "id",
      "source",
      "revision",
      "synced_at",
      "mounts",
      "include",
      "exclude",
      "published",
    ],
    what,
  );
  const { id, source, revision, synced_at, mounts } = record;
  if (typeof id !== "string" || !SOURCE_ID.test(id)) {
    throw new DocsPinsError(
      `${what}.id must match ${SOURCE_ID.source}: ${JSON.stringify(id)}`,
    );
  }
  if (typeof source !== "string" || !SOURCE_SLUG.test(source)) {
    throw new DocsPinsError(
      `${what}.source is malformed: ${JSON.stringify(source)}`,
    );
  }
  if (typeof revision !== "string") {
    throw new DocsPinsError(`${what}.revision must be a string`);
  }
  assertPinFormat(revision);
  if (typeof synced_at !== "string" || Number.isNaN(Date.parse(synced_at))) {
    throw new DocsPinsError(
      `${what}.synced_at must be ISO-8601: ${JSON.stringify(synced_at)}`,
    );
  }
  if (!Array.isArray(mounts) || mounts.length === 0) {
    throw new DocsPinsError(`${what}.mounts must be a non-empty array`);
  }
  const parsedMounts = mounts.map((mount, mountIndex) =>
    parseMount(mount, `${what}.mounts[${mountIndex}]`),
  );
  const pin: DocsSourcePin = {
    id,
    source,
    revision,
    synced_at,
    mounts: parsedMounts,
    published: parseBand(record.published, `${what}.published`),
    ...(record.include === undefined
      ? {}
      : { include: parseIncludeList(record.include, `${what}.include`) }),
    ...(record.exclude === undefined
      ? {}
      : { exclude: parseIncludeList(record.exclude, `${what}.exclude`) }),
  };
  return pin;
}

/**
 * Parse and validate `src/content/docs-revision.json`.
 *
 * @throws {@link DocsPinsError} — with {@link LEGACY_PIN_MIGRATION_MESSAGE}
 *   for the pre-#98 flat shape, and a specific message for every other schema,
 *   id, mount, band, or format problem.
 */
export function parseDocsPinSet(raw: unknown): DocsPinSet {
  const record = asRecord(raw, DOCS_PIN_FILE);
  if (isLegacyPin(record)) {
    throw new DocsPinsError(LEGACY_PIN_MIGRATION_MESSAGE);
  }
  if (record.schema !== DOCS_PIN_SCHEMA) {
    throw new DocsPinsError(
      `${DOCS_PIN_FILE} schema must be ${DOCS_PIN_SCHEMA}; found ${JSON.stringify(record.schema)}`,
    );
  }
  assertKnownKeys(record, ["schema", "sources"], DOCS_PIN_FILE);
  if (!Array.isArray(record.sources) || record.sources.length === 0) {
    throw new DocsPinsError(
      `${DOCS_PIN_FILE} sources must be a non-empty array`,
    );
  }
  const sources = record.sources.map(parseSourcePin);
  const seen = new Set<string>();
  for (const pin of sources) {
    if (seen.has(pin.id)) {
      throw new DocsPinsError(
        `${DOCS_PIN_FILE} has duplicate source id "${pin.id}"`,
      );
    }
    seen.add(pin.id);
  }
  const pins: DocsPinSet = { schema: DOCS_PIN_SCHEMA, sources };
  assertMountsDisjoint(pins);
  // The revision index must be supplied by exactly one declared mount, or the
  // publication policy has no last-resort redirect target. Ownership is decided
  // by resolving the index file through each mount, not by the mirror prefix
  // alone: a mount whose `from` does not contain `docs/README.md` cannot write
  // that path, however plausible its `to` prefix looks.
  const indexOwners = pins.sources.filter((pin) =>
    pin.mounts.some((mount) => mountSuppliesRevisionIndex(mount)),
  );
  if (indexOwners.length === 0) {
    throw new DocsPinsError(
      `${DOCS_PIN_FILE} declares no source that owns the revision index (${REVISION_INDEX_MIRROR_PATH}); a mount must supply ${REVISION_INDEX_SOURCE_PATH} through its \`from\``,
    );
  }
  if (indexOwners.length > 1) {
    throw new DocsPinsError(
      `${DOCS_PIN_FILE} declares ${indexOwners.length} sources that own the revision index (${REVISION_INDEX_MIRROR_PATH}): ${indexOwners
        .map((pin) => pin.id)
        .join(", ")}`,
    );
  }
  return pins;
}

function parseParityResult(value: unknown, what: string): DocsParityResult {
  if (value !== "pass" && value !== "fail") {
    throw new DocsPinsError(`${what} must be "pass" or "fail"`);
  }
  return value;
}

function parseCounts(value: unknown, what: string): DocsSourceCounts {
  const record = asRecord(value, what);
  const keys = [
    "files",
    "pages",
    "published",
    "demoted",
    "withheld",
    "excluded",
  ] as const;
  assertKnownKeys(record, keys, what);
  const counts: Record<string, number> = {};
  for (const key of keys) {
    const entry = record[key];
    if (!Number.isInteger(entry) || (entry as number) < 0) {
      throw new DocsPinsError(`${what}.${key} must be a non-negative integer`);
    }
    counts[key] = entry as number;
  }
  return counts as unknown as DocsSourceCounts;
}

function parseManifestSource(
  value: unknown,
  index: number,
): DocsManifestSource {
  const what = `${DOCS_MANIFEST_FILE} sources[${index}]`;
  const record = asRecord(value, what);
  assertKnownKeys(
    record,
    [
      "id",
      "source",
      "revision",
      "mounts",
      "parity",
      "counts",
      "files",
      "published_routes",
    ],
    what,
  );
  const { id, source, revision, mounts } = record;
  if (typeof id !== "string" || id.length === 0) {
    throw new DocsPinsError(`${what}.id must be a non-empty string`);
  }
  if (typeof source !== "string" || typeof revision !== "string") {
    throw new DocsPinsError(`${what}.source/revision must be strings`);
  }
  if (!Array.isArray(mounts) || mounts.length === 0) {
    throw new DocsPinsError(`${what}.mounts must be a non-empty array`);
  }
  const parityRecord = asRecord(record.parity, `${what}.parity`);
  const parity: DocsParityReport = {
    metadata: parseParityResult(
      parityRecord.metadata,
      `${what}.parity.metadata`,
    ),
    language: parseParityResult(
      parityRecord.language,
      `${what}.parity.language`,
    ),
    links: parseParityResult(parityRecord.links, `${what}.parity.links`),
    hygiene: parseParityResult(parityRecord.hygiene, `${what}.parity.hygiene`),
  };
  const filesRecord = asRecord(record.files, `${what}.files`);
  const files: Record<string, string> = {};
  for (const [path, hash] of Object.entries(filesRecord)) {
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
      throw new DocsPinsError(
        `${what}.files["${path}"] must be a lowercase SHA-256`,
      );
    }
    files[path] = hash;
  }
  if (!Array.isArray(record.published_routes)) {
    throw new DocsPinsError(`${what}.published_routes must be an array`);
  }
  return {
    id,
    source,
    revision,
    mounts: mounts.map((mount, mountIndex) =>
      parseMount(mount, `${what}.mounts[${mountIndex}]`),
    ),
    parity,
    counts: parseCounts(record.counts, `${what}.counts`),
    files,
    published_routes: [...(record.published_routes as string[])].sort(),
  };
}

/** Parse and validate `src/content/docs-manifest.json` (schema 2). */
export function parseDocsManifest(raw: unknown): DocsManifest {
  const record = asRecord(raw, DOCS_MANIFEST_FILE);
  if (record.schema !== DOCS_MANIFEST_SCHEMA) {
    throw new DocsPinsError(
      `${DOCS_MANIFEST_FILE} schema must be ${DOCS_MANIFEST_SCHEMA}; found ${JSON.stringify(record.schema)}`,
    );
  }
  assertKnownKeys(record, ["schema", "sources"], DOCS_MANIFEST_FILE);
  if (!Array.isArray(record.sources) || record.sources.length === 0) {
    throw new DocsPinsError(
      `${DOCS_MANIFEST_FILE} sources must be a non-empty array`,
    );
  }
  const sources = record.sources.map(parseManifestSource);
  return { schema: DOCS_MANIFEST_SCHEMA, sources };
}

/** Mirror-relative prefix a mount writes to (`docs` or `docs/<to>`). */
export function mountMirrorPrefix(mount: DocsMount): string {
  return mount.to === "" ? MIRROR_DOCS_DIR : `${MIRROR_DOCS_DIR}/${mount.to}`;
}

function isUnder(path: string, prefix: string): boolean {
  if (prefix === "") return true;
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * Map a source-relative path through one mount to its mirror-relative path.
 * Returns `null` when the path is not under the mount's `from` directory.
 */
export function mirrorPathFor(
  sourceRelPath: string,
  mount: DocsMount,
): string | null {
  const fromPrefix = mount.from === "." ? "" : `${mount.from}/`;
  if (fromPrefix !== "" && !sourceRelPath.startsWith(fromPrefix)) return null;
  const rel = sourceRelPath.slice(fromPrefix.length);
  if (rel.length === 0) return null;
  return `${mountMirrorPrefix(mount)}/${rel}`;
}

/** The mount (and owning source id) a mirror-relative path belongs to. */
export type MirrorOwner = {
  readonly id: string;
  readonly mount: DocsMount;
};

/**
 * `true` when mapping the corpus revision index through this mount lands
 * exactly on {@link REVISION_INDEX_MIRROR_PATH}.
 *
 * The index file lives at {@link REVISION_INDEX_SOURCE_PATH} (`docs/README.md`)
 * in every corpus, so only a mount whose `from` actually contains that file can
 * write the mirror's revision index. Comparing mirror prefixes alone would let
 * `mounts: [{ from: "docs/decisions", to: "" }]` claim ownership of a path it
 * can never supply.
 */
export function mountSuppliesRevisionIndex(mount: DocsMount): boolean {
  return (
    mirrorPathFor(REVISION_INDEX_SOURCE_PATH, mount) ===
    REVISION_INDEX_MIRROR_PATH
  );
}

/**
 * Resolve the source that owns a mirror-relative path.
 *
 * The most specific (longest) mount prefix wins, so a root catch-all mount
 * (`to: ""`) that is carved by `exclude` never shadows a nested project mount.
 * A tie between two different sources is ambiguous and fails closed.
 */
export function mountForMirrorPath(
  mirrorPath: string,
  pins: DocsPinSet,
): MirrorOwner | null {
  const matches: Array<{ id: string; mount: DocsMount; length: number }> = [];
  for (const pin of pins.sources) {
    for (const mount of pin.mounts) {
      const prefix = mountMirrorPrefix(mount);
      if (isUnder(mirrorPath, prefix)) {
        matches.push({ id: pin.id, mount, length: prefix.length });
      }
    }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.length - a.length);
  const best = matches[0] as (typeof matches)[number];
  const tie = matches.find(
    (candidate) => candidate.length === best.length && candidate.id !== best.id,
  );
  if (tie !== undefined) {
    throw new DocsPinsError(
      `mirror path "${mirrorPath}" is claimed by both "${best.id}" and "${tie.id}"`,
    );
  }
  return { id: best.id, mount: best.mount };
}

/** Owning source id of a mirror-relative path, or `null`. */
export function sourceIdForMirrorPath(
  mirrorPath: string,
  pins: DocsPinSet,
): string | null {
  return mountForMirrorPath(mirrorPath, pins)?.id ?? null;
}

/** The source that owns the revision index (the redirect last-resort target). */
export function revisionIndexOwner(pins: DocsPinSet): DocsSourcePin {
  const owner = mountForMirrorPath(REVISION_INDEX_MIRROR_PATH, pins);
  if (owner === null) {
    throw new DocsPinsError(
      `no pinned source owns the revision index (${REVISION_INDEX_MIRROR_PATH})`,
    );
  }
  const pin = pins.sources.find((candidate) => candidate.id === owner.id);
  if (pin === undefined) {
    throw new DocsPinsError(
      `revision index owner "${owner.id}" is not a pinned source`,
    );
  }
  return pin;
}

/**
 * Fail closed when two mounts of different sources write to the same mirror
 * prefix, or when one non-root prefix is nested under another. A root mount
 * (`to: ""`) may contain nested project mounts; the actual per-file collision
 * is caught by {@link assertNoDuplicateMirrorPaths} at merge time.
 */
export function assertMountsDisjoint(pins: DocsPinSet): void {
  const mounts: Array<{ id: string; to: string }> = [];
  for (const pin of pins.sources) {
    for (const mount of pin.mounts) {
      mounts.push({ id: pin.id, to: mount.to });
    }
  }
  for (let i = 0; i < mounts.length; i += 1) {
    for (let j = i + 1; j < mounts.length; j += 1) {
      const left = mounts[i] as (typeof mounts)[number];
      const right = mounts[j] as (typeof mounts)[number];
      const equal = left.to === right.to;
      const nested =
        left.to !== "" &&
        right.to !== "" &&
        (left.to.startsWith(`${right.to}/`) ||
          right.to.startsWith(`${left.to}/`));
      if (equal || nested) {
        throw new DocsPinsError(
          `mount overlap: "${left.id}" and "${right.id}" both write ${
            left.to === "" ? MIRROR_DOCS_DIR : `${MIRROR_DOCS_DIR}/${left.to}`
          }${equal ? "" : " (nested prefixes)"}`,
        );
      }
    }
  }
}

/** Fail closed when two sources claim the same mirror-relative path. */
export function assertNoDuplicateMirrorPaths(
  entries: ReadonlyArray<{ readonly mirrorPath: string; readonly id: string }>,
): void {
  const byPath = new Map<string, string>();
  for (const entry of entries) {
    const existing = byPath.get(entry.mirrorPath);
    if (existing !== undefined && existing !== entry.id) {
      throw new DocsPinsError(
        `mirror path "${entry.mirrorPath}" is claimed by both "${existing}" and "${entry.id}"`,
      );
    }
    byPath.set(entry.mirrorPath, entry.id);
  }
}

/**
 * Fail closed when a published page's mirror path lies outside every declared
 * mount: a file without provenance must not be publishable.
 */
export function assertPublishedUnderMounts(
  publishedSources: readonly string[],
  pins: DocsPinSet,
): void {
  for (const mirrorPath of publishedSources) {
    if (mountForMirrorPath(mirrorPath, pins) === null) {
      throw new DocsPinsError(
        `published page "${mirrorPath}" is outside every declared mount; a page without provenance must not be published`,
      );
    }
  }
}

/** Mirror-relative paths that no declared mount claims (hand-added content). */
export function mirrorPathsOutsideMounts(
  mirrorPaths: readonly string[],
  pins: DocsPinSet,
): readonly string[] {
  return mirrorPaths
    .filter((mirrorPath) => mountForMirrorPath(mirrorPath, pins) === null)
    .sort();
}

/** Fail closed when the mirror holds a file outside every declared mount. */
export function assertMirrorUnderMounts(
  mirrorPaths: readonly string[],
  pins: DocsPinSet,
): void {
  const outside = mirrorPathsOutsideMounts(mirrorPaths, pins);
  if (outside.length > 0) {
    throw new DocsPinsError(
      `mirror holds ${outside.length} file(s) outside every declared mount (hand-added?): ${outside.slice(0, 10).join(", ")}`,
    );
  }
}

/**
 * Fail closed when one source's published count leaves its reviewed band
 * (#98 §3.4). The band lives in the pin entry, so a movement is attributable
 * to the source that moved and needs a reviewed `just docs-sync` diff.
 */
export function assertSourcePublishedBand(
  pin: Pick<DocsSourcePin, "id" | "published">,
  publishedCount: number,
  addedAndRemoved: {
    readonly added: readonly string[];
    readonly removed: readonly string[];
  } = {
    added: [],
    removed: [],
  },
): void {
  const { min, max } = pin.published;
  if (publishedCount >= min && publishedCount <= max) return;
  const detail: string[] = [];
  if (addedAndRemoved.added.length > 0) {
    detail.push(`added: ${addedAndRemoved.added.slice(0, 10).join(", ")}`);
  }
  if (addedAndRemoved.removed.length > 0) {
    detail.push(`removed: ${addedAndRemoved.removed.slice(0, 10).join(", ")}`);
  }
  throw new DocsPinsError(
    `source "${pin.id}" publishes ${publishedCount} page(s), outside its reviewed band ${min}-${max}${detail.length > 0 ? ` (${detail.join("; ")})` : ""}`,
  );
}

/** Per-source include/exclude carve-outs handed to the selector. */
export type ConsumedSelectorOverrides = {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
};

/**
 * The consumed-file selector (#98 §2.3).
 *
 * Takes the source-relative path list of one materialized snapshot and returns
 * the paths a mount consumes, sorted. The rules:
 *
 * - A mount that names a subdirectory (`from` not `.`) consumes that directory
 *   wholesale; this is what keeps the existing bitty-docs mount (`docs` → ``)
 *   byte-identical to the pre-#98 mirror, where `docs/README.md` is the
 *   revision index and must be consumed.
 * - A mount that points at the repository root (`from: "."`) consumes the root
 *   topic trees only: repository-root files are never consumed (they are
 *   metadata such as `README.md`, `AGENTS.md`, `LICENSE`, `justfile`), and
 *   neither are the reserved top-level entries (`.github`, `.carryctx`,
 *   `.worktrees`, `.git`, `scripts`, `docs`) nor any dot-prefixed entry.
 * - `include` (when non-empty) restricts the mount to the given source-relative
 *   subtrees; `exclude` removes them. Both are reviewed data in the pin entry.
 */
export function selectConsumedPaths(
  sourceRelPaths: readonly string[],
  mount: DocsMount,
  overrides: ConsumedSelectorOverrides = {},
): readonly string[] {
  const include = (overrides.include ?? []).map(stripTrailingSlash);
  const exclude = (overrides.exclude ?? []).map(stripTrailingSlash);
  const selected: string[] = [];
  for (const raw of sourceRelPaths) {
    const path = raw.split("\\").join("/").replace(/^\.\//, "");
    if (path.length === 0) continue;
    const rel = relativeTo(pinsFromPrefix(mount.from), path);
    if (rel === null) continue;
    if (include.length > 0 && !include.some((entry) => isUnder(path, entry))) {
      continue;
    }
    if (exclude.some((entry) => isUnder(path, entry))) continue;
    if (!consumedUnderMount(rel, mount)) continue;
    selected.push(path);
  }
  return selected.sort();
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "");
}

/** The `from` prefix of a mount (empty string for the repository root). */
export function pinsFromPrefix(from: string): string {
  return from === "." ? "" : `${from}/`;
}

function relativeTo(prefix: string, path: string): string | null {
  if (prefix === "") return path;
  if (!path.startsWith(prefix)) return null;
  const rel = path.slice(prefix.length);
  return rel.length === 0 ? null : rel;
}

function consumedUnderMount(rel: string, mount: DocsMount): boolean {
  // A named subdirectory mount is consumed wholesale.
  if (mount.from !== ".") return true;
  const slash = rel.indexOf("/");
  const first = slash === -1 ? rel : rel.slice(0, slash);
  if (first.startsWith(".")) return false;
  if (RESERVED_REPO_ROOT_ENTRIES.includes(first)) return false;
  // A repository-root file (no directory component) is metadata.
  return slash !== -1;
}
