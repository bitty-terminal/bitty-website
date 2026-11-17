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

const officialPlugins = JSON.parse(
  await readFile(
    new URL("../src/data/officialPlugins.json", import.meta.url),
    "utf8",
  ),
);

const REQUIRED_FILES = [
  "index.html",
  "zh-CN/index.html",
  "plugins/index.html",
  "zh-CN/plugins/index.html",
  "ai/index.html",
  "zh-CN/ai/index.html",
  "sitemap.xml",
  "search-index.json",
  "_redirects",
  "_headers",
  ...officialPlugins.flatMap((plugin) => [
    `plugins/${plugin.slug}/index.html`,
    `zh-CN/plugins/${plugin.slug}/index.html`,
  ]),
];

for (const file of REQUIRED_FILES) {
  await required(file, true);
}

const sitemapXml = await readFile(new URL("sitemap.xml", dist), "utf8");
for (const route of [
  "https://bitty.run/plugins/",
  "https://bitty.run/zh-CN/plugins/",
  "https://bitty.run/ai/",
  "https://bitty.run/zh-CN/ai/",
  ...officialPlugins.flatMap((plugin) => [
    `https://bitty.run/plugins/${plugin.slug}/`,
    `https://bitty.run/zh-CN/plugins/${plugin.slug}/`,
  ]),
]) {
  if (!sitemapXml.includes(`<loc>${route}</loc>`)) {
    throw new Error(`sitemap.xml is missing required product route: ${route}`);
  }
}

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

/** Every page must load the design system exactly once. Astro splits CSS per
 * module graph, so a route that never imports `global.css` ships with only
 * component-scoped rules and renders unstyled. The token below only exists in
 * `src/styles/global.css`, which makes it a stable fingerprint. */
const cssDir = new URL("_astro/", dist);
const designSheets = new Set();
for (const entry of await readdir(cssDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".css")) continue;
  const contents = await readFile(new URL(entry.name, cssDir), "utf8");
  if (contents.includes("--neutral-050")) {
    designSheets.add(`/_astro/${entry.name}`);
  }
}
if (designSheets.size === 0) {
  throw new Error("no design-system stylesheet was emitted");
}

async function assertDesignSheet(directory = dist) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      await assertDesignSheet(new URL(`${entry.name}/`, directory));
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(new URL(entry.name, directory), "utf8");
    const stylesheets = [
      ...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/gu),
    ].map((match) => match[1]);
    const loaded = stylesheets.filter((href) => designSheets.has(href)).length;
    if (loaded !== 1) {
      throw new Error(
        `${entry.name}: expected exactly one design-system stylesheet, found ${loaded}`,
      );
    }
  }
}

await assertDesignSheet();

/** Every page with the site sidebar must place it inside `.site-shell`, and
 * no rendered page may expose desktop rail collapse/expand toggles. */
const FORBIDDEN_RAIL_TOKENS = [
  "data-toggle-rail",
  "data-left-collapsed",
  "data-right-collapsed",
  "docs-rail-collapse-btn",
  "docs-rail-toggle",
  "bitty-docs-left",
  "bitty-docs-right",
];

async function assertPermanentSidebarShell(directory = dist) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      await assertPermanentSidebarShell(new URL(`${entry.name}/`, directory));
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(new URL(entry.name, directory), "utf8");
    if (
      html.includes('id="site-sidebar"') &&
      !html.includes('class="site-shell"')
    ) {
      throw new Error(
        `${entry.name}: renders #site-sidebar without .site-shell layout wrapper`,
      );
    }
    for (const token of FORBIDDEN_RAIL_TOKENS) {
      if (html.includes(token)) {
        throw new Error(
          `${entry.name}: unexpected desktop rail collapse token "${token}"`,
        );
      }
    }
  }
}

await assertPermanentSidebarShell();

/** Top-level pages must render the unified sidebar with collapsed manual groups and core links. */
for (const page of ["index.html", "zh-CN/index.html"]) {
  const html = await readFile(new URL(page, dist), "utf8");
  if (
    !html.includes('id="site-sidebar"') ||
    !html.includes('aria-expanded="false"')
  ) {
    throw new Error(`${page}: missing site sidebar toggle state`);
  }
  if (/<details class="docs-nav-group-details"[^>]*\bopen\b/u.test(html)) {
    throw new Error(
      `${page}: manual sidebar groups must be collapsed by default`,
    );
  }
  if (!html.includes('id="install"')) {
    throw new Error(`${page}: missing #install section`);
  }
}

for (const page of ["plugins/index.html", "zh-CN/plugins/index.html"]) {
  const html = await readFile(new URL(page, dist), "utf8");
  const luaRows = (html.match(/<code>bitty-(?:featured|terminal)\./gu) ?? [])
    .length;
  const nativeRows = (
    html.match(/href="https:\/\/github\.com\/bitty-terminal\/bitty-[^"]+"/gu) ??
    []
  ).length;
  if (luaRows !== 13) {
    throw new Error(
      `${page}: expected 13 official Lua plugins, found ${luaRows}`,
    );
  }
  if (nativeRows < 11) {
    throw new Error(
      `${page}: expected at least 11 native extension repo links, found ${nativeRows}`,
    );
  }
}

for (const page of ["ai/index.html", "zh-CN/ai/index.html"]) {
  const html = await readFile(new URL(page, dist), "utf8");
  if (!html.includes("bittyd") || !html.includes("wheel")) {
    throw new Error(`${page}: expected bittyd and wheel content`);
  }
}

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
