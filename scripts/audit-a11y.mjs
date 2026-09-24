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
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

async function collectDocsSamples(limit) {
  const samples = [];
  const latest = join(dist, "docs", "latest");
  if (!(await exists(latest))) {
    return samples;
  }
  async function walk(dir) {
    if (samples.length >= limit) {
      return;
    }
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (samples.length >= limit) {
        return;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name === "index.html") {
        samples.push(full);
      }
    }
  }
  await walk(latest);
  return samples;
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

function auditPage(name, html, { strictHeadings }) {
  if (/<html[^>]*\blang="en"/.test(html)) {
    pass(`${name}: <html lang="en">`);
  } else {
    fail(`${name}: missing <html lang="en">`);
  }
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
  for (const landmark of ["<header", "<main", "<footer"]) {
    if (html.includes(landmark)) {
      pass(`${name}: ${landmark}> landmark present`);
    } else {
      fail(`${name}: ${landmark}> landmark missing`);
    }
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
  const raster = html.match(/<(img|picture|canvas)\b|srcset\s*=/i);
  if (raster === null) {
    pass(`${name}: no raster elements (DPR-crisp)`);
  } else {
    fail(`${name}: raster dependence found: ${raster[0]}`);
  }
  if (html.includes('tabindex="-1"')) {
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

const homeFile = join(dist, "index.html");
if (!(await exists(homeFile))) {
  fail("dist/index.html is missing; run `bun run build` first");
} else {
  auditPage("home", await readFile(homeFile, "utf8"), { strictHeadings: true });
}

const samples = await collectDocsSamples(5);
if (samples.length === 0) {
  warn("no versioned docs samples in dist/docs/latest; docs checks skipped");
} else {
  for (const file of samples) {
    auditPage(
      `docs:${file.split(join("dist", "")).pop()}`,
      await readFile(file, "utf8"),
      {
        strictHeadings: false,
      },
    );
  }
}

await auditCss();
await auditFavicons();

console.log(`\naudit-a11y: ${failures} failure(s), ${warnings} warning(s)`);
if (failures > 0) {
  process.exit(1);
}
