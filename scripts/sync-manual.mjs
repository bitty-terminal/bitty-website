#!/usr/bin/env bun

/**
 * Materialize the canonical bitty-manual bundles published to R2.
 *
 * The website consumes an immutable manual version. The lock file records the
 * exact version and bundle digests; this script verifies both locale archives,
 * extracts only the expected locale trees, and refreshes src/content/manual.
 */

import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildManualPathIndex,
  rewriteManualLinks,
} from "../src/lib/manualLinkRewrite.ts";
import {
  assertRegularArchiveMember,
  assertSafeArchivePath,
} from "../src/lib/manualArchive.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = join(ROOT, "src/content/manual.lock.json");
const MANUAL_ROOT = join(ROOT, "src/content/manual");
const SEARCH_INDEX_PATH = join(ROOT, "src/content/manual-search-index.json");
const CDN_BASE = "https://cdn.bitty.run/manual/bitty-manual";
const LOCALES = ["en", "zh-CN"];
/** Bound the per-record body text so the client index stays small. */
const SEARCH_TEXT_LIMIT = 1200;

async function readLock() {
  const lock = JSON.parse(await readFile(LOCK_PATH, "utf8"));
  if (lock.schema !== 1 || lock.version === undefined) {
    throw new Error(`invalid manual lock: ${LOCK_PATH}`);
  }
  for (const locale of LOCALES) {
    const bundle = lock.bundles?.[locale];
    if (
      typeof bundle?.path !== "string" ||
      !/^[a-f0-9]{64}$/u.test(bundle.sha256)
    ) {
      throw new Error(`invalid ${locale} bundle in ${LOCK_PATH}`);
    }
  }
  return lock;
}

/** Bounded retry: the CDN occasionally resets a connection mid-body. */
const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_BACKOFF_MS = 750;

async function download(url, destination) {
  let lastError;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`manual download failed (${response.status}): ${url}`);
      }
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      if (attempt === DOWNLOAD_ATTEMPTS) break;
      await Bun.sleep(DOWNLOAD_BACKOFF_MS * attempt);
    }
  }
  throw lastError;
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function extractLocale(archive, locale, destination) {
  const listing = Bun.spawnSync(["tar", "-tvzf", archive], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (listing.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(listing.stderr));
  }

  const entries = new TextDecoder()
    .decode(listing.stdout)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([\-d])\S*\s+\S+\s+\S+\s+\S+\s+(.+)$/u);
      if (!match) {
        throw new Error(`manual archive has an unreadable tar member: ${line}`);
      }
      return {
        type: match[1] ?? "",
        path: match[2]?.split(/\s+/u).at(-1) ?? "",
      };
    });
  for (const entry of entries) {
    const path = entry.path.replace(/^\.\//u, "");
    if (path === "") continue;
    assertRegularArchiveMember(entry.type, path, locale);
    assertSafeArchivePath(path, locale);
  }
  if (
    !entries.some((entry) => entry.path.replace(/^\.\//u, "") === `${locale}/`)
  ) {
    throw new Error(`manual archive has no ${locale}/ root: ${archive}`);
  }

  const result = Bun.spawnSync(
    ["tar", "-xzf", archive, "-C", destination, "--no-same-owner"],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (result.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(result.stderr));
  }
}

async function main() {
  const lock = await readLock();
  const staging = await mkdtemp(join(tmpdir(), "bitty-manual-"));
  const nextRoot = join(ROOT, "src/content/manual.next");
  const backupRoot = join(ROOT, "src/content/manual.previous");
  try {
    const extracted = [];
    for (const locale of LOCALES) {
      const bundle = lock.bundles[locale];
      const archive = join(staging, `${locale}.tar.gz`);
      const url = `${CDN_BASE}/${bundle.path}`;
      await download(url, archive);
      const actual = await sha256(archive);
      if (actual !== bundle.sha256) {
        throw new Error(
          `${locale} manual digest mismatch: expected ${bundle.sha256}, got ${actual}`,
        );
      }
      await extractLocale(archive, locale, staging);
      extracted.push(locale);
    }

    const manifestPath = join(staging, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      manifest.version !== lock.version ||
      JSON.stringify(manifest.locales) !== JSON.stringify(LOCALES)
    ) {
      throw new Error("manual manifest does not match the website lock");
    }

    const replacement = join(staging, "manual");
    await mkdir(replacement, { recursive: true });
    await cp(manifestPath, join(replacement, "manifest.json"));
    for (const locale of extracted) {
      await rename(join(staging, locale), join(replacement, locale));
    }

    // Rewrite cross-links on the generated copy so the site renders routes
    // instead of relative `.md` file references. Unpublished targets throw.
    const pathIndex = buildManualPathIndex(manifest);
    for (const locale of LOCALES) {
      for (const section of manifest.sections) {
        for (const item of section.items) {
          const path = join(replacement, locale, item.path);
          const markdown = await readFile(path, "utf8");
          await writeFile(
            path,
            rewriteManualLinks(markdown, item.path, locale, pathIndex),
            "utf8",
          );
        }
      }
    }

    const websiteSearchIndex = [];
    for (const locale of LOCALES) {
      for (const section of manifest.sections) {
        for (const item of section.items) {
          const markdown = await readFile(
            join(replacement, locale, item.path),
            "utf8",
          );
          const title =
            markdown.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? item.title;
          const headings = [...markdown.matchAll(/^#{2,3}\s+(.+)$/gmu)].map(
            (match) => match[1]?.trim() ?? "",
          );
          const excerpt =
            markdown
              .split("\n")
              .map((line) => line.trim())
              .find(
                (line) =>
                  line.length > 0 &&
                  !line.startsWith("#") &&
                  !line.startsWith(">") &&
                  !line.startsWith("```"),
              ) ?? "";
          websiteSearchIndex.push({
            locale,
            slug: `${section.id}/${item.slug}`,
            title,
            description: excerpt,
            category: section.title,
            text: markdown
              .replace(/[`*_>#\[\]()]/gu, " ")
              .replace(/\s+/gu, " ")
              .trim()
              .slice(0, SEARCH_TEXT_LIMIT),
            headings,
          });
        }
      }
    }
    websiteSearchIndex.sort((left, right) =>
      `${left.locale}:${left.slug}`.localeCompare(
        `${right.locale}:${right.slug}`,
      ),
    );

    await rm(nextRoot, { recursive: true, force: true });
    await rm(backupRoot, { recursive: true, force: true });
    await cp(replacement, nextRoot, { recursive: true });
    await rename(MANUAL_ROOT, backupRoot).catch(() => undefined);
    await rename(nextRoot, MANUAL_ROOT);
    await rm(backupRoot, { recursive: true, force: true });
    await writeFile(
      SEARCH_INDEX_PATH,
      `${JSON.stringify(websiteSearchIndex)}\n`,
      "utf8",
    );
    console.log(`synced bitty-manual ${lock.version} (${LOCALES.join(", ")})`);
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(nextRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(
    `error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
