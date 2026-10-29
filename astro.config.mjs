import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writeSitemap } from "./src/lib/sitemap.ts";
import { tableScrollPlugin } from "./src/lib/tableScroll.ts";

const SITE_URL = "https://bitty.run";

function staticArtifacts() {
  return {
    name: "bitty-static-artifacts",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const source = fileURLToPath(
          new URL("./src/content/manual-search-index.json", import.meta.url),
        );
        const output = join(fileURLToPath(dir), "search-index.json");
        await writeFile(output, await readFile(source, "utf8"), "utf8");
        const routes = await writeSitemap(fileURLToPath(dir), SITE_URL);
        await writeFile(
          join(fileURLToPath(dir), "_redirects"),
          [
            "/docs/latest/zh-CN/* /zh-CN/docs/:splat 301",
            "/docs/stable/zh-CN/* /zh-CN/docs/:splat 301",
            "/docs/0.1.0/zh-CN/* /zh-CN/docs/:splat 301",
            "/docs/latest/zh-CN/ /zh-CN/docs/ 301",
            "/docs/stable/zh-CN/ /zh-CN/docs/ 301",
            "/docs/0.1.0/zh-CN/ /zh-CN/docs/ 301",
            "/docs/latest/zh-CN /zh-CN/docs/ 301",
            "/docs/stable/zh-CN /zh-CN/docs/ 301",
            "/docs/0.1.0/zh-CN /zh-CN/docs/ 301",
            "/docs/latest/* /docs/:splat 301",
            "/docs/stable/* /docs/:splat 301",
            "/docs/0.1.0/* /docs/:splat 301",
            "/docs/latest /docs/ 301",
            "/docs/stable /docs/ 301",
            "/docs/0.1.0 /docs/ 301",
            "",
          ].join("\n"),
          "utf8",
        );
        logger.info(
          `wrote search index, sitemap, and ${routes.length} static routes`,
        );
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  output: "static",
  outDir: "./dist",
  vite: {
    define: {
      "import.meta.env.PUBLIC_CDN_BASE_URL": JSON.stringify(
        "https://cdn.bitty.run",
      ),
    },
  },
  markdown: {
    processor: satteri({ hastPlugins: [tableScrollPlugin] }),
    shikiConfig: {
      themes: { light: "github-light", dark: "one-dark-pro" },
    },
  },
  integrations: [staticArtifacts()],
});
