import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { OFFICIAL_PLUGIN_SLUGS } from "./pluginDetails.ts";

export const SITEMAP_FILENAME = "sitemap.xml";

export const CORE_SITE_PATHS = [
  "/",
  "/zh-CN/",
  "/docs/",
  "/zh-CN/docs/",
  "/plugins/",
  "/zh-CN/plugins/",
  "/ai/",
  "/zh-CN/ai/",
] as const;

export const OFFICIAL_PLUGIN_SITE_PATHS: readonly string[] =
  OFFICIAL_PLUGIN_SLUGS.flatMap((slug) => [
    `/plugins/${slug}/`,
    `/zh-CN/plugins/${slug}/`,
  ]);

async function collectRoutes(
  root: string,
  directory = root,
): Promise<string[]> {
  const routes: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      routes.push(...(await collectRoutes(root, path)));
      continue;
    }
    if (!entry.isFile() || entry.name !== "index.html") continue;
    const html = await readFile(path, "utf8");
    if (/<meta\s+http-equiv="refresh"/iu.test(html)) continue;
    const relativePath = relative(root, path).split("\\").join("/");
    routes.push(
      relativePath === "index.html"
        ? "/"
        : `/${relativePath.slice(0, -"index.html".length)}`,
    );
  }
  return routes.sort();
}

export async function collectSitePaths(outDir?: string): Promise<string[]> {
  const staticPaths = [...CORE_SITE_PATHS, ...OFFICIAL_PLUGIN_SITE_PATHS];
  if (!outDir) {
    return staticPaths.sort();
  }
  const discovered = await collectRoutes(outDir);
  return [...new Set([...staticPaths, ...discovered])].sort();
}

export function renderSitemap(
  origin: string,
  routes: readonly string[],
): string {
  const base = origin.replace(/\/+$/u, "");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) => `  <url><loc>${base}${route}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

export async function writeSitemap(
  outDir: string,
  origin: string,
): Promise<readonly string[]> {
  const routes = await collectRoutes(outDir);
  await writeFile(
    join(outDir, SITEMAP_FILENAME),
    renderSitemap(origin, routes),
    "utf8",
  );
  return routes;
}

export function sitemapRoutes(xml: string): readonly string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => {
    const url = match[1] ?? "";
    return url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/iu, "") || "/";
  });
}
