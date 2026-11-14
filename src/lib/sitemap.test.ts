import { describe, expect, test } from "bun:test";

import {
  CORE_SITE_PATHS,
  collectSitePaths,
  renderSitemap,
  sitemapRoutes,
} from "./sitemap.ts";

describe("sitemap", () => {
  test("includes bilingual /plugins/ and /ai/ product pages in core site paths", async () => {
    const paths = await collectSitePaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/zh-CN/");
    expect(paths).toContain("/plugins/");
    expect(paths).toContain("/zh-CN/plugins/");
    expect(paths).toContain("/ai/");
    expect(paths).toContain("/zh-CN/ai/");
  });

  test("renders and parses sitemap XML routes", () => {
    const xml = renderSitemap("https://bitty.run", CORE_SITE_PATHS);
    const routes = sitemapRoutes(xml);
    expect(routes).toEqual(CORE_SITE_PATHS);
  });
});
