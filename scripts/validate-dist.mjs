import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/", import.meta.url);
const immutable = "public, max-age=31536000, immutable";
const revalidate = "public, max-age=0, must-revalidate";

async function requireFile(path, { nonEmpty = false } = {}) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing required build output: ${path.pathname}`);
  }

  if (nonEmpty && (await readFile(path, "utf8")).length === 0) {
    throw new Error(`Empty required build output: ${path.pathname}`);
  }
}

function parseHeaderRules(source) {
  const rules = new Map();
  let activeRule;

  for (const line of source.split(/\r?\n/u)) {
    if (line.startsWith("/")) {
      activeRule = line;
      rules.set(activeRule, new Map());
      continue;
    }

    const header = line.match(/^\s+([^:]+):\s*(.+)$/u);
    if (header && activeRule) {
      rules.get(activeRule).set(header[1].toLowerCase(), header[2]);
    }
  }

  return rules;
}

function requireCacheRule(rules, route, expectedValue) {
  const cacheControl = rules.get(route)?.get("cache-control");
  if (cacheControl !== expectedValue) {
    throw new Error(
      `[${route}] Cache-Control must be "${expectedValue}", received "${cacheControl ?? "missing"}"`,
    );
  }
}

await requireFile(new URL("index.html", dist));
await requireFile(new URL("_redirects", dist), { nonEmpty: true });
await requireFile(new URL("redirects.json", dist), { nonEmpty: true });
await requireFile(new URL("_headers", dist), { nonEmpty: true });
await requireFile(new URL("search-index.json", dist), { nonEmpty: true });

// Site search (CTX-0040): every index record must resolve to a rendered
// page — the same known-pages idea as the link audit. Slugs are canonical
// (version-less), so they are checked against the `latest` segment; the
// search box replays the same slug under the page's own segment at runtime.
async function collectDistPages(root) {
  const pages = new Set();
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        pages.add(
          path
            .slice(root.length + 1)
            .split("\\")
            .join("/"),
        );
      }
    }
  }
  await walk(root);
  return pages;
}

const distDir = fileURLToPath(dist).replace(/\/+$/u, "");
const knownPages = await collectDistPages(distDir);
const records = JSON.parse(
  await readFile(new URL("search-index.json", dist), "utf8"),
);
if (!Array.isArray(records) || records.length === 0) {
  throw new Error("search-index.json must hold a non-empty record array");
}
for (const record of records) {
  if (
    typeof record?.slug !== "string" ||
    typeof record?.title !== "string" ||
    record.title.length === 0 ||
    typeof record?.text !== "string" ||
    record.text.length === 0
  ) {
    throw new Error("search-index.json holds a record without slug/title/text");
  }
  const page =
    record.slug === ""
      ? "docs/latest/index.html"
      : `docs/latest/${record.slug}/index.html`;
  if (!knownPages.has(page)) {
    throw new Error(`search-index.json points at missing page: ${page}`);
  }
}

async function requireAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  throw new Error(`Unexpected Worker bundle: ${path.pathname}`);
}

await requireAbsent(new URL("_worker.js", dist));

const rules = parseHeaderRules(
  await readFile(new URL("_headers", dist), "utf8"),
);
requireCacheRule(rules, "/_astro/*", immutable);
requireCacheRule(rules, "/icons/*", revalidate);
requireCacheRule(rules, "/", revalidate);

console.log("Static output and cache-header validation passed.");
