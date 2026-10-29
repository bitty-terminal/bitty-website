import { access, readFile } from "node:fs/promises";

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
}

try {
  await access(new URL("_worker.js", dist));
  throw new Error("unexpected Worker bundle in static output");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(`validated static output (${records.length} search records)`);
