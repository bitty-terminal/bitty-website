// scripts/audit-a11y.mjs — static accessibility audit over the built site.
//
// Runs after `bun run build` (wired into `bun run check` as `audit:a11y`).
// No dependencies: pure string checks over dist HTML plus the theme CSS.
// Fails closed on structural regressions; favicon wiring is warn-only while
// PR #64 (cmd/favicon-bittie) owns the icon set.
//
// Covered owner-directive items:
//   keyboard nav + skip link, landmarks, heading order, SVG diagram a11y,
//   touch-target CSS, reduced-motion CSS, responsive diagram container,
//   DPR-crisp rendering (no raster elements), favicon assets (warn-only).
//
// Not covered here (manual checklist in the owning task/PR):
//   screen-reader pass, real-device spot checks at 360px-4K,
//   high-DPR visual inspection of the SVG diagram.
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assetPolicyFindings,
  auditDocsShell,
  collectRenderedPages,
  findBrokenInternalLinks,
  sidebarListDepth,
} from "../src/lib/a11yAudit.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const cssPath = join(root, "src", "styles", "global.css");

let failures = 0;
let warnings = 0;

function pass(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  console.log(`FAIL  ${message}`);
  failures += 1;
}

function warn(message) {
  console.log(`WARN  ${message}`);
  warnings += 1;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dist-relative HTML paths covered by an exact rule in `dist/redirects.json`.
 *
 * A redirected route is a shipped route: the publication policy (website#97)
 * excludes pages from the site and every excluded route 301s to its nearest
 * surviving ancestor, so a link to one resolves instead of 404ing. Redirect
 * stubs are covered on their own by the collected HTML paths.
 */
async function redirectCoveredRoutes() {
  const file = join(dist, "redirects.json");
  if (!(await exists(file))) return [];
  const parsed = JSON.parse(await readFile(file, "utf8"));
  const rules = Array.isArray(parsed?.redirects) ? parsed.redirects : [];
  const covered = [];
  for (const rule of rules) {
    const from = typeof rule?.from === "string" ? rule.from : "";
    if (!from.startsWith("/docs/") || !from.endsWith("/")) continue;
    covered.push(`${from.slice(1)}index.html`);
  }
  return covered;
}

function checkHeadingOrder(html) {
  const levels = [];
  const pattern = /<h([1-6])\b[^>]*>/gi;
  let match = pattern.exec(html);
  while (match !== null) {
    levels.push(Number(match[1]));
    match = pattern.exec(html);
  }
  if (levels.length === 0 || levels[0] !== 1) {
    return "first heading is not h1";
  }
  const h1Count = levels.filter((level) => level === 1).length;
  if (h1Count !== 1) {
    return `expected exactly one h1, found ${h1Count}`;
  }
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] > levels[i - 1] + 1) {
      return `heading jumps from h${levels[i - 1]} to h${levels[i]}`;
    }
  }
  return null;
}

function checkSvgBlocks(html) {
  const blocks = html.match(/<svg\b[\s\S]*?<\/svg>/gi) ?? [];
  const labelled = blocks.filter((block) => block.includes('role="img"'));
  const problems = [];
  for (const block of labelled) {
    if (!block.includes("<title")) {
      problems.push("svg[role=img] without <title>");
    }
    if (!block.includes("<desc")) {
      problems.push("svg[role=img] without <desc>");
    }
  }
  return { labelled: labelled.length, problems };
}

function auditPage(name, html, { strictHeadings, passthrough }) {
  if (/<html[^>]*\blang="en"/.test(html)) {
    pass(`${name}: <html lang="en">`);
  } else {
    fail(`${name}: missing <html lang="en">`);
  }
  if (passthrough) {
    // Upstream standalone app mirrored verbatim (architecture/interactive/):
    // it owns its own chrome and a11y, so site-template checks (skip link,
    // footer landmark, programmatic focus target) do not apply. Asset policy
    // still applies but warn-only — the mirror must not be hand-edited and the
    // references are recorded as an accepted exception in docs/cdn-assets.md.
    pass(`${name}: passthrough: site-chrome checks not applicable`);
  } else {
    if (
      html.includes('class="skip-link"') &&
      html.includes('href="#main-content"')
    ) {
      pass(`${name}: skip link present`);
    } else {
      fail(`${name}: skip link missing`);
    }
    if (html.includes('id="main-content"')) {
      pass(`${name}: skip-link target #main-content exists`);
    } else {
      fail(`${name}: skip-link target #main-content missing`);
    }
  }
  for (const landmark of ["<header", "<main"]) {
    if (html.includes(landmark)) {
      pass(`${name}: ${landmark}> landmark present`);
    } else {
      fail(`${name}: ${landmark}> landmark missing`);
    }
  }
  if (passthrough) {
    // Covered by the passthrough note above: footer is site chrome.
  } else if (html.includes("<footer")) {
    pass(`${name}: <footer> landmark present`);
  } else {
    fail(`${name}: <footer> landmark missing`);
  }
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count === 1) {
    pass(`${name}: exactly one h1`);
  } else {
    fail(`${name}: expected one h1, found ${h1Count}`);
  }
  if (strictHeadings) {
    const problem = checkHeadingOrder(html);
    if (problem === null) {
      pass(`${name}: heading order logical`);
    } else {
      fail(`${name}: heading order: ${problem}`);
    }
  }
  const svg = checkSvgBlocks(html);
  if (svg.labelled === 0) {
    pass(`${name}: no svg[role=img] to label-check`);
  } else if (svg.problems.length === 0) {
    pass(`${name}: ${svg.labelled} svg[role=img] with title+desc`);
  } else {
    for (const problem of svg.problems) {
      fail(`${name}: ${problem}`);
    }
  }
  // Binary raster payloads are served from Cloudflare R2 (see
  // docs/cdn-assets.md), so the built site must stay text-only apart from the
  // policy-approved bundled SVG vector formats. The classifier inspects every
  // URL-bearing attribute and every srcset candidate, rather than trusting the
  // first value found on an element. Passthrough mirrors keep their bundled
  // raster references warn-only against the accepted exception recorded in
  // docs/cdn-assets.md; every other page fails.
  const assetFindings = assetPolicyFindings(name, html, passthrough);
  if (assetFindings.length === 0) {
    pass(`${name}: no bundled raster elements (R2-hosted assets allowed)`);
  } else {
    for (const finding of assetFindings) {
      if (finding.severity === "warn") {
        warn(finding.detail);
      } else {
        fail(finding.detail);
      }
    }
  }
  if (passthrough) {
    // Covered by the passthrough note above: focus target is site chrome.
  } else if (html.includes('tabindex="-1"')) {
    pass(`${name}: programmatic focus target present`);
  } else {
    fail(`${name}: main target missing tabindex="-1"`);
  }
}

async function auditCss() {
  if (!(await exists(cssPath))) {
    fail("src/styles/global.css is missing");
    return;
  }
  const css = await readFile(cssPath, "utf8");
  const required = [
    ["prefers-reduced-motion", "reduced-motion guard"],
    [":focus-visible", "visible focus styling"],
    [".skip-link", "skip-link styling"],
    ["min-block-size: 2.75rem", "44px touch-target minimum"],
    [".diagram-scroll", "responsive diagram scroll container"],
  ];
  for (const [token, label] of required) {
    if (css.includes(token)) {
      pass(`theme css: ${label}`);
    } else {
      fail(`theme css: ${label} (${token}) missing`);
    }
  }

  // CTX-0050 layout guard: the article must own its page-grid column. When
  // `.docs-article` is `display: contents`, its children become grid items of
  // `.docs-layout` and the tall sidebar drawer sizes the header's row, so the
  // article body only starts below the drawer (measured 1280x900: header
  // bottom 356, prose top 1091 — 735px of empty space).
  if (/\.docs-article\s*\{[^}]*display:\s*contents/iu.test(css)) {
    fail(
      "docs shell css: .docs-article is display: contents (the sidebar row grows the header and drops the body)",
    );
  } else if (
    /\.docs-layout\s*>\s*\.docs-article\s*\{[^}]*grid-column\s*:/iu.test(css)
  ) {
    pass("docs shell css: article owns its page-grid column");
  } else {
    fail("docs shell css: .docs-layout > .docs-article is not placed");
  }
}

async function auditFavicons() {
  const icons = join(dist, "icons");
  if (!(await exists(icons))) {
    warn(
      "dist/icons absent: favicon set owned by PR #64, skipping asset check",
    );
    return;
  }
  const required = ["favicon-16.png", "favicon-32.png", "apple-touch-icon.png"];
  for (const file of required) {
    if (await exists(join(icons, file))) {
      pass(`favicon asset: ${file}`);
    } else {
      fail(`favicon asset missing: ${file}`);
    }
  }
}

if (!(await exists(dist))) {
  fail("dist is missing; run `bun run build` first");
} else {
  const pages = await collectRenderedPages(dist);
  const renderedPages = pages.filter((page) => !page.redirectStub);
  const redirectStubs = pages.length - renderedPages.length;
  pass(
    `audited ${renderedPages.length} rendered page(s) from ${pages.length} HTML file(s); skipped ${redirectStubs} redirect stub(s)`,
  );
  const knownPages = new Set(pages.map((entry) => entry.relativePath));
  for (const covered of await redirectCoveredRoutes()) {
    knownPages.add(covered);
  }
  for (const page of renderedPages) {
    const name =
      page.path === join(dist, "index.html")
        ? "home"
        : `page:${page.relativePath}`;
    const html = await readFile(page.path, "utf8");
    auditPage(name, html, {
      strictHeadings: page.path === join(dist, "index.html"),
      passthrough: page.passthrough,
    });
    // CTX-0050 docs shell: the one-h1 rule above cannot see a duplicated
    // title, an extra aria-current, or a deeper-than-two-layer sidebar, so
    // the shell contract is asserted separately on every rendered docs page.
    if (!page.passthrough && page.relativePath.startsWith("docs/")) {
      const defects = auditDocsShell(html);
      if (defects.length === 0) {
        pass(
          `${name}: docs shell (single title, one aria-current, ${sidebarListDepth(html)}-layer sidebar, breadcrumb)`,
        );
      } else {
        for (const defect of defects) {
          fail(`${name}: docs shell: ${defect.detail}`);
        }
      }
    }
    if (!page.passthrough) {
      // Site-internal doc links must resolve to a rendered page. Redirect
      // stubs count as shipped routes. Upstream passthrough apps own their
      // own links and are out of scope here.
      // Warn-only: the dead targets are upstream `website_publish: false`
      // pages linked from published indexes, and the mirror must not be
      // hand-edited. Tracked in bitty-docs#374; flip back to fail once the
      // upstream index stops linking unpublished targets.
      for (const broken of findBrokenInternalLinks(
        html,
        page.relativePath,
        knownPages,
      )) {
        warn(
          `${name}: dead internal link ${broken.href} (resolves to ${broken.resolved}, no rendered page; tracked in bitty-docs#374)`,
        );
      }
    }
  }
}

await auditCss();
await auditFavicons();

console.log(`\naudit-a11y: ${failures} failure(s), ${warnings} warning(s)`);
if (failures > 0) {
  process.exit(1);
}
