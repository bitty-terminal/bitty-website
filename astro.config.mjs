import { defineConfig } from "astro/config";

// Website Delivery RFC: build-time redirects are the rendered view of the
// per-version expanded redirect table (RD-3). At this scaffold size the
// table is empty; the implementation in src/lib/redirects.ts owns expansion
// and validation. Static /docs -> /docs/latest/ redirect satisfies MV-3
// without requiring a docs revision pin fetch at config time.

const websiteRedirects = {
  "/docs": "/docs/latest/",
};

export default defineConfig({
  output: "static",
  outDir: "./dist",
  redirects: websiteRedirects,
});
