#!/usr/bin/env bun
/**
 * Resolve the current stable release tag before an Astro build.
 *
 * Source of truth: `https://cdn.bitty.run/install/latest.txt` (published by
 * the release workflow's `r2-stable` job). `BITTY_RELEASE_TAG` overrides it
 * for local previews. A network failure is not fatal: the committed
 * `src/content/release.json` keeps the last known tag so offline builds and
 * CI without egress still succeed.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const TARGET = fileURLToPath(
  new URL("../src/content/release.json", import.meta.url),
);
const LATEST_URL = "https://cdn.bitty.run/install/latest.txt";
const TAG_RE = /^v\d+\.\d+\.\d+$/;

async function current() {
  try {
    const parsed = JSON.parse(await readFile(TARGET, "utf8"));
    if (typeof parsed.tag === "string" && TAG_RE.test(parsed.tag)) {
      return parsed.tag;
    }
  } catch {
    // fall through to the network probe
  }
  return null;
}

async function fetchLatest() {
  const response = await fetch(LATEST_URL, {
    signal: AbortSignal.timeout(5000),
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error(`latest.txt returned ${response.status}`);
  }
  const tag = (await response.text()).trim();
  if (!TAG_RE.test(tag)) {
    throw new Error(`latest.txt returned an invalid tag: ${tag}`);
  }
  return tag;
}

const override = process.env.BITTY_RELEASE_TAG;
let tag;
if (override !== undefined) {
  if (!TAG_RE.test(override)) {
    console.error(`BITTY_RELEASE_TAG must match vX.Y.Z, got "${override}"`);
    process.exit(1);
  }
  tag = override;
} else {
  tag = (await current()) ?? "v0.0.29";
  try {
    tag = await fetchLatest();
  } catch (error) {
    console.warn(
      `release: could not read latest.txt (${error.message}); keeping ${tag}`,
    );
  }
}

const next = { tag, version: tag.slice(1) };
const previous = await readFile(TARGET, "utf8").catch(() => "");
if (previous.trim() !== JSON.stringify(next, null, 2)) {
  await writeFile(TARGET, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`release: pinned ${tag}`);
} else {
  console.log(`release: ${tag} (unchanged)`);
}
