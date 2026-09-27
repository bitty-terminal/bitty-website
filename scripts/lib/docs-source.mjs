#!/usr/bin/env bun
/**
 * Shared helpers for the pinned documentation sources (bitty-website#98).
 *
 * Website Delivery RFC SY-2/SY-3/SY-4 plus the multi-source aggregation model:
 *  - `src/content/docs-revision.json` (schema 2) is the only consumed-corpus
 *    identifier, one entry per source;
 *  - every source's pinned revision is materialized in its own isolated
 *    temporary clone and the shared checkouts are never mutated;
 *  - the canonical parity gates run on each pinned snapshot, not on a working
 *    tree;
 *  - the consumed-file selector and the mount→mirror-path mapping come from
 *    the single authority `../../src/lib/docsPins.ts`;
 *  - the mirror and its provenance manifest are compared byte-for-byte.
 *
 * Only the scripts in this repository import this module. It has no network
 * access of its own; cloning uses the git CLI against a derived or configured
 * remote.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

import {
  DocsPinsError,
  mirrorPathFor,
  parseDocsPinSet,
  selectConsumedPaths,
} from "../../src/lib/docsPins.ts";

/** Canonical parity gate modes every corpus ships. */
export const PARITY_MODES = ["metadata", "language", "links", "hygiene"];

const SOURCE_SLUG = /^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

export class SyncError extends Error {}

export function repoPaths(root) {
  return {
    pinFile: join(root, "src", "content", "docs-revision.json"),
    manifestFile: join(root, "src", "content", "docs-manifest.json"),
    mirrorRoot: join(root, "src", "content", "docs"),
    mirrorDocs: join(root, "src", "content", "docs", "docs"),
  };
}

/** Normalize a docs-pins error into the scripts' error type. */
function toSyncError(error) {
  if (error instanceof DocsPinsError) return new SyncError(error.message);
  return error;
}

/**
 * Parse `--pin <sha|tag>` and `--source <id>` from argv, rejecting an unknown
 * or duplicated argument. Both are optional: with no `--pin` the run
 * re-materializes every source at its committed pin (the idempotence gate).
 */
export function parseSyncArgs(argv) {
  let pin = null;
  let source = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--pin" || arg === "--source") {
      if (i + 1 >= argv.length) {
        throw new SyncError(`${arg} requires a value`);
      }
      const value = argv[i + 1];
      if (arg === "--pin") pin = value;
      else source = value;
      i++;
    } else if (arg.startsWith("--pin=")) {
      pin = arg.slice("--pin=".length);
    } else if (arg.startsWith("--source=")) {
      source = arg.slice("--source=".length);
    } else {
      throw new SyncError(`unknown argument: ${arg}`);
    }
  }
  return {
    pin: pin === null ? null : pin.trim(),
    source: source === null ? null : source.trim(),
  };
}

/** {@link assertPinFormat} from the schema authority, as a SyncError. */
export function assertPinFormat(revision) {
  try {
    parseDocsPinSet({
      schema: 2,
      sources: [
        {
          id: "pin-format",
          source: "github.com/example/example",
          revision,
          synced_at: new Date(0).toISOString(),
          mounts: [{ from: ".", to: "" }],
          published: { min: 0, max: 0 },
        },
      ],
    });
  } catch (error) {
    throw toSyncError(error);
  }
}

/** Read and validate the committed pin file (schema 2 only). */
export async function readPinFile(root) {
  const { pinFile } = repoPaths(root);
  if (!existsSync(pinFile)) {
    throw new SyncError(`missing pin file ${relative(root, pinFile)} (SY-1)`);
  }
  let raw;
  try {
    raw = JSON.parse(await readFile(pinFile, "utf8"));
  } catch (error) {
    throw new SyncError(`malformed pin file: ${error.message}`);
  }
  try {
    return parseDocsPinSet(raw);
  } catch (error) {
    throw toSyncError(error);
  }
}

/**
 * Read the raw pin file without schema validation.
 *
 * Used only by `sync-docs.mjs` so it can detect the pre-#98 flat shape and
 * migrate it (the migration is a `just docs-sync` run); every other reader
 * goes through {@link readPinFile}, which rejects the legacy shape with the
 * migration message.
 */
export async function readRawPinFile(root) {
  const { pinFile } = repoPaths(root);
  if (!existsSync(pinFile)) return null;
  try {
    return JSON.parse(await readFile(pinFile, "utf8"));
  } catch (error) {
    throw new SyncError(`malformed pin file: ${error.message}`);
  }
}

/**
 * Read the raw provenance manifest without schema validation. Used by the
 * regression gate in `sync-docs.mjs` to read the committed baseline; `null`
 * when the file is absent or the legacy shape.
 */
export async function readRawManifest(root) {
  const { manifestFile } = repoPaths(root);
  if (!existsSync(manifestFile)) return null;
  try {
    return JSON.parse(await readFile(manifestFile, "utf8"));
  } catch (error) {
    throw new SyncError(`malformed provenance manifest: ${error.message}`);
  }
}

/** `true` when `raw` is the pre-#98 flat `{revision, source, synced_at}`. */
export function isLegacyPin(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return false;
  const keys = Object.keys(raw);
  if (keys.length === 0 || "schema" in raw || "sources" in raw) return false;
  return keys.every((key) => ["revision", "source", "synced_at"].includes(key));
}

/**
 * Migrate the legacy flat pin to schema 2 in memory: one `bitty-docs` source
 * whose mount (`docs` → ``) reproduces every current mirror path unchanged.
 * `publishedBand` is the observed per-source band (reviewed when committed).
 */
export function migrateLegacyPin(raw, publishedBand) {
  const id = repoNameForSource(raw.source)
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
  return {
    schema: 2,
    sources: [
      {
        id,
        source: raw.source,
        revision: raw.revision,
        synced_at: raw.synced_at,
        mounts: [{ from: "docs", to: "" }],
        published: publishedBand,
      },
    ],
  };
}

/** Derive an HTTPS clone URL from the pin's `source` slug, or an env override. */
export function remoteUrlForSource(source) {
  const override = process.env.BITTY_DOCS_REMOTE;
  if (override) return override;
  if (!SOURCE_SLUG.test(source)) {
    throw new SyncError(`cannot derive a remote from source "${source}"`);
  }
  return `https://${source}.git`;
}

/** Last path segment of a `github.com/org/repo` slug (the checkout name). */
export function repoNameForSource(source) {
  const parts = String(source).split("/");
  return parts[parts.length - 1] ?? "";
}

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (!allowFailure && result.status !== 0) {
    throw new SyncError(
      `git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return result;
}

/** Candidate local checkouts of one source, in preference order. */
export function findLocalRepo(root, source) {
  const repoName = repoNameForSource(source);
  if (repoName.length === 0) return null;
  const candidates = [];
  // The explicit override only ever applies to the original bitty-docs pin,
  // so it cannot silently redirect a project corpus checkout.
  if (repoName === "bitty-docs" && process.env.BITTY_DOCS_REPO_PATH) {
    candidates.push(process.env.BITTY_DOCS_REPO_PATH);
  }
  if (process.env.BITTY_WORKSPACE) {
    candidates.push(join(process.env.BITTY_WORKSPACE, repoName));
  }
  for (const dir of ancestorDirs(root)) candidates.push(join(dir, repoName));
  for (const candidate of candidates) {
    if (existsSync(join(candidate, ".git"))) return candidate;
  }
  return null;
}

function ancestorDirs(start) {
  const dirs = [];
  let current = resolve(start);
  for (;;) {
    dirs.push(current);
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

async function cloneInto(source, dest) {
  await mkdir(resolve(dest, ".."), { recursive: true });
  const result = spawnSync("git", ["clone", "--quiet", source, dest], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new SyncError(
      `git clone ${source} failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
}

async function resolveSha(dir, pinValue) {
  const result = git(dir, ["rev-parse", "--verify", `${pinValue}^{commit}`], {
    allowFailure: true,
  });
  if (result.status !== 0) return null;
  const sha = result.stdout.trim();
  return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
}

/**
 * Materialize `pinValue` in an isolated clone and return the resolved SHA.
 *
 * Prefers a local checkout of the source (repo name derived from the slug) so
 * the clone reads existing objects and never touches a shared working tree;
 * falls back to the derived remote when the local checkout does not contain
 * the pin. The caller owns `dir` and must remove it with `cleanupSnapshot`.
 */
export async function materializeSnapshot({ root, pinValue, source, id }) {
  const local = findLocalRepo(root, source);
  if (!local && !source) {
    throw new SyncError(
      "cannot locate a local checkout and no source slug is known; set BITTY_DOCS_REPO_PATH or BITTY_DOCS_REMOTE",
    );
  }
  const candidates = [local, source ? remoteUrlForSource(source) : null].filter(
    Boolean,
  );
  const dir = await mkdtemp(
    join(tmpdir(), `bitty-docs-snapshot-${id ?? "source"}-`),
  );
  let lastError = null;
  for (const candidate of candidates) {
    try {
      await rm(dir, { recursive: true, force: true });
      await cloneInto(candidate, dir);
      const sha = await resolveSha(dir, pinValue);
      if (!sha) {
        lastError = new SyncError(
          `pin "${pinValue}" does not resolve to a commit in ${candidate}`,
        );
        continue;
      }
      git(dir, ["checkout", "--quiet", "--detach", sha]);
      return { sha, dir, source: candidate };
    } catch (error) {
      lastError = error;
    }
  }
  await rm(dir, { recursive: true, force: true });
  throw (
    lastError ??
    new SyncError(`could not materialize pin "${pinValue}" from any source`)
  );
}

/** Remove an isolated snapshot directory. */
export async function cleanupSnapshot(dir) {
  if (dir) await rm(dir, { recursive: true, force: true });
}

/**
 * Run the canonical four parity gates on one pinned snapshot. Returns a
 * per-mode result so the manifest can record evidence instead of a bare pass.
 */
export function runParityGatesDetailed(snapshotDir) {
  const script = join(snapshotDir, ".github", "scripts", "check-docs.mjs");
  const results = {};
  const outputs = {};
  if (!existsSync(script)) {
    throw new SyncError(
      `pinned snapshot is missing .github/scripts/check-docs.mjs; cannot run parity gates`,
    );
  }
  for (const mode of PARITY_MODES) {
    const result = spawnSync("bun", [script, mode], {
      cwd: snapshotDir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    results[mode] = result.status === 0 ? "pass" : "fail";
    outputs[mode] = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  }
  return { results, outputs };
}

/** Per-mode parity results as the manifest records them. */
export function parityReport(detailed) {
  const report = {};
  for (const mode of PARITY_MODES) report[mode] = detailed.results[mode];
  return report;
}

/** Run the parity gates and fail closed, naming every failed mode. */
export function runParityGates(snapshotDir) {
  const detailed = runParityGatesDetailed(snapshotDir);
  const failed = PARITY_MODES.filter(
    (mode) => detailed.results[mode] !== "pass",
  );
  if (failed.length > 0) {
    const detail = failed
      .map((mode) => `"${mode}":\n${detailed.outputs[mode]}`)
      .join("\n\n");
    throw new SyncError(
      `parity gate(s) failed on the pinned snapshot: ${failed.join(", ")}\n${detail}`,
    );
  }
}

async function walkFiles(baseDir, relDir = "") {
  const out = [];
  const entries = await readdir(join(baseDir, relDir), {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const rel = relDir ? join(relDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(baseDir, rel)));
    } else if (entry.isFile()) {
      out.push(rel.split(sep).join("/"));
    }
  }
  return out;
}

/** SHA-256 of one file. */
export async function sha256File(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

/** SHA-256 of every regular file under `dir`, keyed by POSIX-relative path. */
export async function hashTree(dir) {
  const files = await walkFiles(dir);
  const hashes = {};
  for (const rel of files.sort()) {
    hashes[rel] = await sha256File(join(dir, rel));
  }
  return hashes;
}

/**
 * The consumed files of one pinned snapshot, resolved through the pin's mounts.
 *
 * The selector itself lives in `../../src/lib/docsPins.ts` (the single
 * authority); this function only walks the snapshot, asks the selector, and
 * maps each consumed source path to its mirror path and content hash.
 *
 * @returns sorted `{ mirrorPath, sourceRelPath, absPath, hash }` records
 */
export async function collectConsumedFiles(snapshotDir, pin) {
  const all = await walkFiles(snapshotDir);
  const files = [];
  for (const mount of pin.mounts) {
    const selected = selectConsumedPaths(all, mount, {
      ...(pin.include === undefined ? {} : { include: pin.include }),
      ...(pin.exclude === undefined ? {} : { exclude: pin.exclude }),
    });
    for (const sourceRelPath of selected) {
      const mirrorPath = mirrorPathFor(sourceRelPath, mount);
      if (mirrorPath === null) continue;
      const absPath = join(snapshotDir, ...sourceRelPath.split("/"));
      files.push({
        mirrorPath,
        sourceRelPath,
        absPath,
        hash: await sha256File(absPath),
      });
    }
  }
  // Code-unit order (not localeCompare) so the manifest hash map has the same
  // key order as a plain sorted tree walk; the mirror bytes and the manifest
  // stay byte-identical across the pre-#98 and schema-2 pipelines.
  return files.sort((left, right) =>
    left.mirrorPath < right.mirrorPath
      ? -1
      : left.mirrorPath > right.mirrorPath
        ? 1
        : 0,
  );
}

/** `{ mirrorPath: sha256 }` of a consumed-file list, in path order. */
export function hashMapOf(files) {
  const hashes = {};
  for (const file of files) hashes[file.mirrorPath] = file.hash;
  return hashes;
}

/** Copy a materialized tree (containing `docs/`) over the mirror root. */
export async function replaceMirror(sourceRoot, mirrorRoot) {
  await rm(mirrorRoot, { recursive: true, force: true });
  await mkdir(mirrorRoot, { recursive: true });
  await cp(join(sourceRoot, "docs"), join(mirrorRoot, "docs"), {
    recursive: true,
    preserveTimestamps: false,
  });
}

/**
 * Write the consumed files of every source into a fresh staging directory,
 * deterministically. The caller loads the publication corpus from the staging
 * directory and runs the regression gates before anything touches the
 * committed mirror.
 */
export async function stageMirror(stagingDir, files) {
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });
  for (const file of files) {
    const dest = join(stagingDir, ...file.mirrorPath.split("/"));
    await mkdir(resolve(dest, ".."), { recursive: true });
    await cp(file.absPath, dest);
  }
}

/** Sorted list of key differences between two hash maps. */
export function diffHashMaps(expected, actual) {
  const missing = [];
  const extra = [];
  const changed = [];
  for (const key of Object.keys(expected)) {
    if (!(key in actual)) missing.push(key);
    else if (actual[key] !== expected[key]) changed.push(key);
  }
  for (const key of Object.keys(actual)) {
    if (!(key in expected)) extra.push(key);
  }
  return {
    missing: missing.sort(),
    extra: extra.sort(),
    changed: changed.sort(),
  };
}

/** Deterministically serialize a JSON artifact with a trailing newline. */
export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Write a file only when its bytes would change (idempotent sync). */
export async function writeFileIfChanged(file, content) {
  let current = null;
  try {
    current = await readFile(file, "utf8");
  } catch {
    current = null;
  }
  if (current === content) return false;
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, content, "utf8");
  return true;
}

/** Current ISO-8601 UTC timestamp. */
export function nowIso() {
  return new Date().toISOString();
}

export function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Publication eligibility is NOT defined here.
 *
 * The published set — and therefore the `N publishable` count the sync/check
 * pipeline prints — comes from the one policy module
 * (`src/lib/publicationCorpus.ts` over `src/lib/publicationPolicy.ts`,
 * website#97). This module keeps only the pinned-source boundary (pin file,
 * isolated snapshots, parity gates, selector, mirror + manifest hashing).
 */
