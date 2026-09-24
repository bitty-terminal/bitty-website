import { access, readFile } from "node:fs/promises";

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
