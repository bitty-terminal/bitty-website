#!/usr/bin/env bun
/**
 * Shared helpers for the pinned bitty-docs source boundary.
 *
 * Website Delivery RFC SY-2/SY-3/SY-4 (OQ-023):
 *  - one committed pin file is the only consumed-corpus identifier;
 *  - the pinned revision is materialized in an isolated temporary clone and
 *    the shared bitty-docs checkout is never mutated;
 *  - canonical parity gates run on the pinned snapshot, not on a working tree;
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

export const SHA40 = /^[0-9a-f]{40}$/;
export const FLOATING_BRANCHES = new Set([
  "main",
  "master",
  "develop",
  "dev",
  "latest",
  "next",
]);
const TAG_LIKE = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SOURCE_SLUG = /^[A-Za-z0-9.-]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const PARITY_MODES = ["metadata", "language", "links", "hygiene"];

export class SyncError extends Error {}

export function repoPaths(root) {
  return {
    pinFile: join(root, "src", "content", "docs-revision.json"),
    manifestFile: join(root, "src", "content", "docs-manifest.json"),
    mirrorRoot: join(root, "src", "content", "docs"),
    mirrorDocs: join(root, "src", "content", "docs", "docs"),
  };
}

/** Parse `--pin <value>` from argv, rejecting a missing or duplicate value. */
export function parsePinArg(argv) {
  let pin = "";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--pin") {
      if (i + 1 >= argv.length) {
        throw new SyncError("--pin requires a value");
      }
      pin = argv[i + 1];
      i++;
    } else if (arg.startsWith("--pin=")) {
      pin = arg.slice("--pin=".length);
    } else {
      throw new SyncError(`unknown argument: ${arg}`);
    }
  }
  if (!pin) {
    throw new SyncError(
      "usage: bun run sync:docs --pin <40-char-sha|immutable-tag>",
    );
  }
  return pin.trim();
}

/** Validate the pin syntax. Throws SyncError on floating, short, or malformed pins. */
export function assertPinFormat(pin) {
  if (FLOATING_BRANCHES.has(pin)) {
    throw new SyncError(`pin must not be a floating branch: "${pin}" (SY-3)`);
  }
  if (SHA40.test(pin)) return;
  if (/^[0-9a-f]{4,39}$/.test(pin) || /^[0-9a-fA-F]{40}$/.test(pin)) {
    throw new SyncError(
      `pin must be a full lowercase 40-char SHA, not a short or mixed-case SHA: "${pin}" (SY-2)`,
    );
  }
  if (!TAG_LIKE.test(pin)) {
    throw new SyncError(
      `pin "${pin}" is not a 40-char SHA or an immutable tag (SY-3)`,
    );
  }
}

/** Read and shape-check the committed pin file. */
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
  const allowed = new Set(["revision", "source", "synced_at"]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new SyncError(`pin file has unknown key "${key}" (SY-1)`);
    }
  }
  for (const key of allowed) {
    if (typeof raw[key] !== "string" || raw[key].length === 0) {
      throw new SyncError(`pin file field "${key}" must be a non-empty string`);
    }
  }
  assertPinFormat(raw.revision);
  if (!SOURCE_SLUG.test(raw.source)) {
    throw new SyncError(`pin file source is malformed: "${raw.source}"`);
  }
  if (Number.isNaN(Date.parse(raw.synced_at))) {
    throw new SyncError(
      `pin file synced_at must be ISO-8601: "${raw.synced_at}"`,
    );
  }
  return raw;
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

/** Candidate local bitty-docs checkouts, in preference order. */
export function findLocalDocsRepo(root) {
  const candidates = [
    process.env.BITTY_DOCS_REPO_PATH,
    process.env.BITTY_WORKSPACE
      ? join(process.env.BITTY_WORKSPACE, "bitty-docs")
      : null,
    ...ancestorDirs(root).map((dir) => join(dir, "bitty-docs")),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (
      existsSync(join(candidate, ".git")) &&
      existsSync(join(candidate, "docs"))
    ) {
      return candidate;
    }
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

/** Derive the `github.com/org/repo` source slug from a local checkout. */
export function deriveSourceFromLocal(root) {
  const local = findLocalDocsRepo(root);
  if (!local) return null;
  const result = git(local, ["remote", "get-url", "origin"], {
    allowFailure: true,
  });
  if (result.status !== 0) return null;
  const url = result.stdout.trim();
  const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (!match) return null;
  return `github.com/${match[1]}/${match[2]}`;
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
  return SHA40.test(sha) ? sha : null;
}

/**
 * Materialize `pinValue` in an isolated clone and return the resolved SHA.
 *
 * Prefers a local bitty-docs checkout so the clone reads existing objects and
 * never touches the shared working tree; falls back to the derived remote when
 * the local checkout does not contain the pin. The caller owns `dir` and must
 * remove it with `cleanupSnapshot`.
 */
export async function materializeSnapshot({ root, pinValue, source }) {
  const local = findLocalDocsRepo(root);
  if (!local && !source) {
    throw new SyncError(
      "cannot locate a bitty-docs checkout and no source is known; set BITTY_DOCS_REPO_PATH or BITTY_DOCS_REMOTE",
    );
  }
  const sources = [local, source ? remoteUrlForSource(source) : null].filter(
    Boolean,
  );
  const dir = await mkdtemp(join(tmpdir(), "bitty-docs-snapshot-"));
  let lastError = null;
  for (const candidate of sources) {
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

/** Run the canonical four bitty-docs gates on the pinned snapshot. */
export function runParityGates(snapshotDir) {
  const script = join(snapshotDir, ".github", "scripts", "check-docs.mjs");
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
    if (result.status !== 0) {
      const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
      throw new SyncError(
        `bitty-docs parity gate "${mode}" failed on the pinned snapshot:\n${detail}`,
      );
    }
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

/** SHA-256 of every regular file under `dir`, keyed by POSIX-relative path. */
export async function hashTree(dir) {
  const files = await walkFiles(dir);
  const hashes = {};
  for (const rel of files.sort()) {
    const bytes = await readFile(join(dir, rel));
    hashes[rel] = createHash("sha256").update(bytes).digest("hex");
  }
  return hashes;
}

/**
 * `docs/...` paths whose frontmatter sets `website_publish: true`.
 * `dirWithDocs` is a tree that contains a top-level `docs/` directory.
 */
export async function listEligibleSourcePaths(dirWithDocs) {
  const found = [];
  async function walk(dir, rel) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, next);
      } else if (entry.isFile() && next.endsWith(".md")) {
        const body = await readFile(full, "utf8");
        if (/^website_publish:\s*true\s*$/m.test(body)) {
          found.push(`docs/${next}`);
        }
      }
    }
  }
  await walk(join(dirWithDocs, "docs"), "");
  return found.sort();
}

/** Only the `docs/...` entries of a whole-tree hash map. */
export function docsOnly(hashes) {
  return Object.fromEntries(
    Object.entries(hashes).filter(([key]) => key.startsWith("docs/")),
  );
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

/** Replace the mirrored docs tree with the pinned snapshot's `docs/` tree. */
export async function replaceMirror(snapshotDir, mirrorRoot) {
  await rm(mirrorRoot, { recursive: true, force: true });
  await mkdir(mirrorRoot, { recursive: true });
  await cp(join(snapshotDir, "docs"), join(mirrorRoot, "docs"), {
    recursive: true,
    preserveTimestamps: false,
  });
}

/** Current ISO-8601 UTC timestamp. */
export function nowIso() {
  return new Date().toISOString();
}

export function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
