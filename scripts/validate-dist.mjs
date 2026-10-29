import { access, readdir, readFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const manifest = JSON.parse(
  await readFile(
    new URL("../src/content/manual/manifest.json", import.meta.url),
    "utf8",
  ),
);
const expectedRecords =
  manifest.locales.length *
  manifest.sections.reduce((total, section) => total + section.items.length, 0);

async function required(name, nonEmpty = false) {
  const path = new URL(name, dist);
  await access(path);
  if (nonEmpty && (await readFile(path, "utf8")).trim().length === 0) {
    throw new Error(`empty required build output: ${name}`);
  }
}

await required("index.html", true);
await required("sitemap.xml", true);
await required("search-index.json", true);
await required("_redirects", true);
await required("_headers", true);

const records = JSON.parse(
  await readFile(new URL("search-index.json", dist), "utf8"),
);
if (!Array.isArray(records) || records.length !== expectedRecords) {
  throw new Error(
    `expected ${expectedRecords} locale search records, received ${records.length}`,
  );
}
for (const record of records) {
  if (
    !manifest.locales.includes(record?.locale) ||
    typeof record?.slug !== "string" ||
    typeof record?.title !== "string" ||
    typeof record?.text !== "string" ||
    record.title.length === 0 ||
    record.text.length === 0
  ) {
    throw new Error("search index contains an invalid record");
  }
  const prefix = record.locale === "zh-CN" ? "zh-CN/docs" : "docs";
  const page = new URL(`${prefix}/${record.slug}/index.html`, dist);
  try {
    await access(page);
  } catch {
    throw new Error(
      `search record "${record.locale}:${record.slug}" has no rendered page`,
    );
  }
}

/** Every rendered table must sit inside the keyboard-scrollable region. */
async function assertTablesAreScrollable(directory = dist) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      await assertTablesAreScrollable(new URL(`${entry.name}/`, directory));
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(new URL(entry.name, directory), "utf8");
    const tables = (html.match(/<table\b/gu) ?? []).length;
    const wrappers = (html.match(/class="table-scroll"/gu) ?? []).length;
    if (tables !== wrappers) {
      throw new Error(
        `${entry.name}: ${tables} table(s) but ${wrappers} scrollable region(s)`,
      );
    }
  }
}

await assertTablesAreScrollable();

/** Redirect aliases must cover the Chinese versioned paths with and without
 * a trailing slash; the generic `/docs/latest/*` rule otherwise sends them to
 * a nonexistent `/docs/zh-CN/`. */
const redirects = await readFile(new URL("_redirects", dist), "utf8");
for (const version of ["latest", "stable", "0.1.0"]) {
  for (const form of [`/docs/${version}/zh-CN/`, `/docs/${version}/zh-CN`]) {
    if (!redirects.includes(`${form} /zh-CN/docs/ 301`)) {
      throw new Error(`missing Chinese redirect rule for ${form}`);
    }
  }
}
// Cloudflare does not evaluate `_redirects` strictly in file order, so the
// generic version rule can win first. This fallback must exist so the
// intermediate `/docs/zh-CN/...` path still lands on the Chinese manual.
for (const rule of [
  "/docs/zh-CN/* /zh-CN/docs/:splat 301",
  "/docs/zh-CN/ /zh-CN/docs/ 301",
]) {
  if (!redirects.includes(rule)) {
    throw new Error(`missing Chinese fallback redirect: ${rule}`);
  }
}

/** Resolve the alias chain the way the edge does: first matching rule wins. */
function resolveRedirect(path) {
  const rules = redirects
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [from = "", to = ""] = line.split(/\s+/u);
      return { from, to };
    });
  let current = path;
  for (let step = 0; step < 5; step += 1) {
    let next = null;
    for (const rule of rules) {
      if (rule.from.endsWith("/*")) {
        const base = rule.from.slice(0, -1);
        if (current.startsWith(base)) {
          next = rule.to.replace(":splat", current.slice(base.length));
          break;
        }
      } else if (rule.from === current) {
        next = rule.to;
        break;
      }
    }
    if (next === null) return current;
    current = next;
  }
  throw new Error(`redirect chain does not settle: ${path}`);
}

for (const alias of [
  "/docs/latest/zh-CN/",
  "/docs/stable/zh-CN/",
  "/docs/0.1.0/zh-CN/",
  "/docs/0.1.0/zh-CN/getting-started/cli/",
]) {
  const resolved = resolveRedirect(alias);
  if (!resolved.startsWith("/zh-CN/docs/")) {
    throw new Error(`${alias} resolves to ${resolved}, not the Chinese manual`);
  }
  const target = resolved.endsWith("/")
    ? `${resolved.slice(1)}index.html`
    : `${resolved.slice(1)}/index.html`;
  try {
    await access(new URL(target, dist));
  } catch {
    throw new Error(`${alias} resolves to a missing page: ${resolved}`);
  }
}

try {
  await access(new URL("_worker.js", dist));
  throw new Error("unexpected Worker bundle in static output");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(`validated static output (${records.length} search records)`);
