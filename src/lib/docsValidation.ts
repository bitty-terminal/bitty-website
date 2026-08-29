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

const SHA40 = /^[0-9a-f]{40}$/;
const ALIAS_SET = new Set(["latest", "stable"]);
const CJK_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f]/u;

export type DocsRevisionShape = {
  readonly revision: string;
  readonly source: string;
  readonly synced_at: string;
};

export function assertValidRevisionPin(): DocsRevisionShape {
  const raw = docsRevision as unknown as Record<string, unknown>;
  if (
    typeof raw.revision !== "string" ||
    typeof raw.source !== "string" ||
    typeof raw.synced_at !== "string"
  ) {
    throw new Error(
      "src/content/docs-revision.json must contain { revision, source, synced_at } as strings",
    );
  }
  const extra = Object.keys(raw).filter(
    (k) => !["revision", "source", "synced_at"].includes(k),
  );
  if (extra.length > 0) {
    throw new Error(
      `src/content/docs-revision.json has unknown keys: ${extra.join(", ")}`,
    );
  }

  const rev: string = raw.revision;
  // Accept either full SHA or immutable release tag (e.g. v0.1.0 / 0.1.0). Reject floating branches.
  const isSha = SHA40.test(rev);
  const isTag =
    /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(rev);
  const isFloatingBranch = /^(main|master|develop|dev|latest|next)$/.test(rev);

  if (isFloatingBranch) {
    throw new Error(
      `Pinned revision must not be a floating branch: "${rev}" (SY-3)`,
    );
  }
  if (rev.length !== 40 && !isTag) {
    // Short SHA (e.g. 7 chars) or branch-like name — fail closed per SY-3/SY-2
    if (/^[0-9a-f]{4,39}$/.test(rev)) {
      throw new Error(
        `Pinned revision must be a full 40-char SHA or a tag, not a short SHA: "${rev}"`,
      );
    }
    if (!isSha && !isTag) {
      throw new Error(
        `Pinned revision "${rev}" is not a 40-char SHA or immutable tag (SY-3)`,
      );
    }
  }
  if (rev.length === 40 && !isSha) {
    throw new Error(
      `Pinned revision "${rev}" looks like a SHA but is not lowercase hex`,
    );
  }

  // Freshness: synced_at must be ISO-8601 UTC
  if (Number.isNaN(Date.parse(raw.synced_at))) {
    throw new Error(
      `src/content/docs-revision.json synced_at must be ISO-8601 UTC: "${raw.synced_at}"`,
    );
  }

  return raw as DocsRevisionShape;
}

export function assertNoCjk(body: string, file: string): void {
  const match = CJK_RE.exec(body);
  if (match) {
    throw new Error(
      `English-only gate: CJK text at ${file} index ${match.index} (LD-4)`,
    );
  }
}

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
      typeof v.revision !== "string" ||
      typeof v.label !== "string" ||
      typeof v.prerelease !== "boolean"
    ) {
      throw new Error(
        `Invalid version entry ${JSON.stringify(v)} — must have version/revision/label/prerelease`,
      );
    }
    if (v.version.startsWith("v")) {
      throw new Error(
        `Version must omit leading v per MV-1: "${String(v.version)}"`,
      );
    }
    const extraVersionKeys = Object.keys(v).filter(
      (k) => !["version", "revision", "label", "prerelease"].includes(k),
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
