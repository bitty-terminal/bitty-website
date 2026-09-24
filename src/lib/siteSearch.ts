/**
 * Keyword search over docs articles (CTX-0040).
 *
 * Browser-safe: no Node imports, so the search box can lazy-load this module
 * from any page. The record set comes from the build-time static index
 * (`dist/search-index.json`, written by `searchIndex.ts`); records carry
 * canonical version-less slugs and the caller resolves them against the
 * current page's version segment, so `latest`/`stable` aliases keep working
 * without triple-indexing every hosted version.
 */

export type SearchRecord = {
  /** Canonical slug, e.g. `specifications/foo`; `""` for the revision index. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  /** Plain article prose (tags stripped at build time). */
  readonly text: string;
};

export type SearchHit = {
  readonly record: SearchRecord;
  readonly score: number;
};

/** Maximum results returned per query; keeps the dropdown navigable. */
export const MAX_RESULTS = 10;

/**
 * Minimal English stopword set. A query made only of these (or of blank
 * input) matches everything by frequency, so it returns no hits instead of
 * flooding the dropdown.
 */
const STOP_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "with",
]);

/** Lowercase alphanumeric tokens; docs are English-only per repo policy. */
export function tokenize(query: string): readonly string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return count;
    count += 1;
    from = at + needle.length;
  }
}

function scoreRecord(record: SearchRecord, tokens: readonly string[]): number {
  const title = record.title.toLowerCase();
  const description = record.description.toLowerCase();
  const category = record.category.toLowerCase();
  const slugWords = record.slug.toLowerCase().replace(/\//gu, " ");
  const text = record.text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (description.includes(token)) score += 3;
    if (category.includes(token) || slugWords.includes(token)) score += 2;
    score += Math.min(countOccurrences(text, token), 3);
  }
  return score;
}

/**
 * Rank records against a keyword query. Title matches outrank description,
 * category/slug, then capped body-term frequency. Ties break by title for
 * stable output. Returns at most `limit` hits with a positive score.
 */
export function searchRecords(
  records: readonly SearchRecord[],
  query: string,
  limit: number = MAX_RESULTS,
): readonly SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const record of records) {
    const score = scoreRecord(record, tokens);
    if (score > 0) hits.push({ record, score });
  }
  hits.sort(
    (left, right) =>
      right.score - left.score ||
      left.record.title.localeCompare(right.record.title),
  );
  return hits.slice(0, Math.max(0, limit));
}

/**
 * Resolve a version-less record to the versioned docs route of the page the
 * search box is rendered on. The version segment passes through untouched, so
 * `latest`, `stable`, and explicit `x.y.z` segments all keep working.
 *
 * @throws on an empty or path-breaking version segment (fail closed).
 */
export function recordHref(
  record: Pick<SearchRecord, "slug">,
  version: string,
): string {
  if (
    version.length === 0 ||
    version.includes("/") ||
    version.includes("\\") ||
    version.includes(" ")
  ) {
    throw new Error(`Invalid version segment "${version}"`);
  }
  return record.slug === ""
    ? `/docs/${version}/`
    : `/docs/${version}/${record.slug}/`;
}
