#!/usr/bin/env bun
/**
 * Machine-derived route-move inventory (bitty-website#98 §5 / task T4).
 *
 * A "route move" is a redirect-inventory entry that the current change adds or
 * rewrites relative to a base revision: the old route, the new route, and the
 * declared status / leaf-ness / reason. The table is derived from the
 * committed redirect inventory (`src/redirects.json`) diffed against the base
 * ref — never hand-written — so a PR body can carry the real inventory instead
 * of a hand-maintained one.
 *
 * usage:
 *   bun scripts/report-route-moves.mjs [--base <ref>] [--all] [--json]
 *
 *   --base <ref>  revision to diff against (default: $GITHUB_BASE_REF, else
 *                 `main`, else `origin/main`, else `HEAD`)
 *   --all         list every declared non-publication move, not just the new
 *                 ones (context for a review; not the regression inventory)
 *   --json        emit the inventory as JSON
 *
 * With no new or rewritten entries (no route moves in the change) the table is
 * empty — the expected state when nothing has moved.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REDIRECTS = "src/redirects.json";

function parseArgs(argv) {
  let base = null;
  let all = false;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--base") {
      base = argv[i + 1] ?? null;
      i++;
    } else if (arg.startsWith("--base=")) {
      base = arg.slice("--base=".length);
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--json") {
      json = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { base, all, json };
}

function gitShow(ref, path) {
  return execFileSync("git", ["show", `${ref}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function resolveBase(preferred) {
  const candidates = [
    preferred,
    process.env.GITHUB_BASE_REF,
    "main",
    "origin/main",
    "HEAD",
  ].filter(
    (candidate) => typeof candidate === "string" && candidate.length > 0,
  );
  for (const candidate of candidates) {
    try {
      gitShow(candidate, REDIRECTS);
      return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function parseEntries(raw, what) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${what} is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${what} must be an array`);
  return parsed;
}

function key(entry) {
  return JSON.stringify(entry);
}

function isMove(entry) {
  // Publication-policy demotions are not route moves; they are exclusions.
  return !String(entry.reason ?? "").includes("publication policy");
}

function main() {
  const { base: baseArg, all, json } = parseArgs(process.argv.slice(2));
  const base = resolveBase(baseArg);
  if (base === null) {
    throw new Error(
      "cannot resolve a base revision for the route-move diff; pass --base <ref>",
    );
  }

  const working = parseEntries(
    readFileSync(resolve(ROOT, REDIRECTS), "utf8"),
    REDIRECTS,
  );
  const baseline = parseEntries(
    gitShow(base, REDIRECTS),
    `${base}:${REDIRECTS}`,
  );
  const baselineKeys = new Set(baseline.map(key));

  const declaredMoves = working.filter(isMove);
  const newMoves = all
    ? declaredMoves
    : declaredMoves.filter((entry) => !baselineKeys.has(key(entry)));

  const rows = newMoves.map((entry) => ({
    old: entry.old,
    new: entry.new,
    status: entry.status,
    descendants: entry.descendants ?? true,
    reason: entry.reason,
    effective_version: entry.effective_version,
  }));

  if (json) {
    console.log(
      JSON.stringify(
        {
          base,
          route_moves: rows.length,
          declared_non_publication_entries: declaredMoves.length,
          moves: rows,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    `route moves vs ${base}: ${rows.length}${all ? " (--all: every declared move)" : ""}`,
  );
  if (rows.length > 0) {
    console.log("old -> new  [status, descendants, effective_version]  reason");
    for (const row of rows) {
      console.log(
        `${row.old} -> ${row.new}  [${row.status}, descendants=${row.descendants}, ${row.effective_version}]  ${row.reason}`,
      );
    }
  }
  console.log(
    `declared non-publication redirect entries in ${REDIRECTS}: ${declaredMoves.length}`,
  );
}

try {
  main();
} catch (error) {
  console.error(`error: ${error?.message ?? String(error)}`);
  process.exit(1);
}
