/**
 * Build-time validation helpers for the Website Delivery RFC (OQ-023).
 *
 * SY-3 / SY-4: pinned revision must be a full 40-char SHA or immutable tag;
 * floating branches, short SHAs, and stale mirrors fail closed.
 *
 * LD-4: English-only CJK gate — Han/Hiragana/Katakana/Hangul/Bopomofo + U+3000-303F.
 * RS-5 / RD-4 / MV-... are validated in versions and redirects modules but
 * re-checked here for fail-closed composition in the build.
 */

import docsRevision from "../content/docs-revision.json" with { type: "json" };
import versionsJson from "../content/versions.json" with { type: "json" };
import { parseDocsPinSet, type DocsPinSet } from "./docsPins.ts";

const ALIAS_SET = new Set(["latest", "stable"]);
const CJK_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f]/u;

/**
 * Validate `src/content/docs-revision.json` at build time (SY-2/SY-3/SY-4).
 *
 * The schema and mount validation live in the single authority
 * (`./docsPins.ts`, bitty-website#98), so the schema the sync wrote and the
 * schema the build accepts cannot drift. Returns the parsed pin set so callers
 * can read the per-source entries; the legacy flat shape is rejected there
 * with the migration message.
 */
export function assertValidRevisionPin(): DocsPinSet {
  try {
    return parseDocsPinSet(docsRevision);
  } catch (error) {
    throw new Error(
      `${(error as Error).message} (src/content/docs-revision.json)`,
    );
  }
}

export function assertNoCjk(body: string, file: string): void {
  const match = CJK_RE.exec(body);
  if (match) {
    throw new Error(
      `English-only gate: CJK text at ${file} index ${match.index} (LD-4)`,
    );
  }
}

/**
 * Validate `src/content/versions.json` at build time (RS-1/RS-4).
 *
 * Since bitty-website#98 a version no longer records one docs `revision`: the
 * site aggregates several pinned sources, so the version record carries a
 * derived corpus-set identity (`docs_corpus`, `sha256:<64-hex>`) instead. The
 * identity is recomputed from the pins and cross-checked in the build and by
 * `scripts/validate-dist.mjs` (`assertVersionsCorpusSet`), so a pin advance
 * cannot leave the version evidence claiming an older corpus set.
 */
export function assertVersionsShape(): typeof versionsJson {
  const raw = versionsJson as unknown as Record<string, unknown>;
  if (typeof raw.latest !== "string" || typeof raw.stable !== "string") {
    throw new Error(
      "src/content/versions.json must contain latest/stable as strings (RS-1)",
    );
  }
  if (!Array.isArray(raw.versions)) {
    throw new Error(
      "src/content/versions.json versions must be an array (RS-1)",
    );
  }
  for (const v of raw.versions as Array<Record<string, unknown>>) {
    if (
      typeof v.version !== "string" ||
      typeof v.docs_corpus !== "string" ||
      typeof v.label !== "string" ||
      typeof v.prerelease !== "boolean"
    ) {
      throw new Error(
        `Invalid version entry ${JSON.stringify(v)} — must have version/docs_corpus/label/prerelease (RS-4; the retired single revision is replaced by the derived corpus-set identity, bitty-website#98)`,
      );
    }
    if (v.version.startsWith("v")) {
      throw new Error(
        `Version must omit leading v per MV-1: "${String(v.version)}"`,
      );
    }
    const extraVersionKeys = Object.keys(v).filter(
      (k) => !["version", "docs_corpus", "label", "prerelease"].includes(k),
    );
    if (extraVersionKeys.length > 0) {
      throw new Error(
        `Version entry "${String(v.version)}" has unknown keys: ${extraVersionKeys.join(", ")}`,
      );
    }
  }
  const allowedKeys = new Set(["latest", "stable", "versions"]);
  for (const k of Object.keys(raw)) {
    if (!allowedKeys.has(k)) {
      throw new Error(`src/content/versions.json unknown key "${k}" (RS-1)`);
    }
  }
  const versionValues = new Set(
    (raw.versions as Array<{ version: string }>).map((v) => v.version),
  );
  if (
    !versionValues.has(raw.latest as string) &&
    !ALIAS_SET.has(raw.latest as string)
  ) {
    throw new Error(
      `latest "${String(raw.latest)}" must be one of versions[].version`,
    );
  }
  return versionsJson as typeof versionsJson;
}

export function validVersionSegments(): Set<string> {
  const data = assertVersionsShape();
  const segments = new Set<string>(["latest", "stable"]);
  for (const v of data.versions as Array<{ version: string }>) {
    segments.add(v.version);
  }
  return segments;
}
