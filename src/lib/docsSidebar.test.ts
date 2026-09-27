/**
 * Docs navigation fixtures (`./docsSidebar.ts`).
 *
 * Pins the CTX-0050 contract: at most two list levels with six reader-intent
 * groups on top, a route that is both a folder and a page labelled with its
 * own title (the previous fixed "Contents" disclosure), `aria-current="page"`
 * on exactly the current link, breadcrumbs derived from the route (no dead
 * links, no frontmatter), and previous/next neighbours taken from the sidebar
 * reading order.
 */

import { describe, expect, test } from "bun:test";

import { sidebarListDepth } from "./a11yAudit.ts";
import {
  DOCS_ROOT_LABEL,
  buildBreadcrumbs,
  buildNavGroups,
  displayTitle,
  flattenNavEntries,
  hrefFor,
  pagerFor,
  renderSidebarTree,
  routeLabel,
  segmentLabel,
  type SidebarEntry,
} from "./docsSidebar.ts";

describe("displayTitle", () => {
  test("strips ADR machine prefixes", () => {
    expect(displayTitle("ADR 0003 - Core Workspace Topology")).toBe(
      "Core Workspace Topology",
    );
    expect(displayTitle("ADR 0001 - Repository Bootstrap Baseline")).toBe(
      "Repository Bootstrap Baseline",
    );
  });

  test("strips finding prefixes", () => {
    expect(
      displayTitle("Finding 0001 - Astro and TypeScript 7 Check Compatibility"),
    ).toBe("Astro and TypeScript 7 Check Compatibility");
  });

  test("strips trailing RFC suffixes", () => {
    expect(displayTitle("Appearance Configuration RFC")).toBe(
      "Appearance Configuration",
    );
    expect(displayTitle("CLI Contract RFC")).toBe("CLI Contract");
  });

  test("leaves human titles byte-identical", () => {
    for (const title of [
      "Decision register",
      "Documentation map",
      "Core and Plugin Boundaries",
      "2026 - A Year in Review",
    ]) {
      expect(displayTitle(title)).toBe(title);
    }
  });
});

describe("segmentLabel and routeLabel", () => {
  test("capitalizes a hyphenated segment", () => {
    expect(segmentLabel("user-guide")).toBe("User guide");
    expect(segmentLabel("adrs")).toBe("Adrs");
  });

  test("prefers the page title and falls back to the segment", () => {
    expect(routeLabel("decisions", "Decision register")).toBe(
      "Decision register",
    );
    expect(routeLabel("decisions/adrs", undefined)).toBe("Adrs");
    expect(routeLabel("", undefined)).toBe("");
  });
});

const entries: SidebarEntry[] = [
  { slug: "", title: "Documentation map", order: 0 },
  { slug: "decisions", title: "Decision register", order: 1 },
  { slug: "decisions/adrs", title: "Architecture decision records", order: 2 },
  {
    slug: "decisions/adrs/adr-0003-core-workspace-topology",
    title: "ADR 0003 - Core Workspace Topology",
    order: 33,
  },
  {
    slug: "decisions/rfcs/rfc-0001-appearance-configuration",
    title: "Appearance Configuration RFC",
    order: 5,
  },
  {
    slug: "development/toolchain-policy",
    title: "Toolchain and Tooling Policy",
    order: 4,
  },
  {
    slug: "projects/bitty/specifications/lua-runtime-rfc",
    title: "Lua Runtime RFC",
    order: 7,
  },
  { slug: "projects/bitty/user-guide/readme", title: "User guide", order: 3 },
];

const titles = new Map(entries.map((entry) => [entry.slug, entry.title]));

describe("buildNavGroups", () => {
  test("caps the top level at six groups and drops empty ones", () => {
    const groups = buildNavGroups(entries, "decisions");
    expect(groups.map((group) => group.label)).toEqual([
      "Overview",
      "Concepts",
      "Using",
      "Reference",
      "Project",
    ]);
  });

  test("orders groups by the manifest and entries by order then label", () => {
    const groups = buildNavGroups(entries, "");
    const concepts = groups.find((group) => group.id === "concepts");
    expect(concepts?.entries.map((entry) => entry.slug)).toEqual([
      "decisions",
      "decisions/adrs",
      "decisions/rfcs/rfc-0001-appearance-configuration",
      "decisions/adrs/adr-0003-core-workspace-topology",
    ]);
    // A route inside `projects/<project>/` is grouped by its topic segment,
    // not by the project directory.
    expect(
      groups.find((group) => group.id === "using")?.entries.map((e) => e.slug),
    ).toEqual(["projects/bitty/user-guide/readme"]);
    expect(
      groups
        .find((group) => group.id === "reference")
        ?.entries.map((e) => e.slug),
    ).toEqual(["projects/bitty/specifications/lua-runtime-rfc"]);
    expect(
      groups
        .find((group) => group.id === "project")
        ?.entries.map((e) => e.slug),
    ).toEqual(["development/toolchain-policy"]);
  });

  test("marks the group holding the current page", () => {
    const groups = buildNavGroups(entries, "development/toolchain-policy");
    expect(groups.filter((group) => group.isCurrent).map((g) => g.id)).toEqual([
      "project",
    ]);
  });
});

describe("flattenNavEntries", () => {
  test("reads groups in manifest order and entries in sidebar order", () => {
    const flat = flattenNavEntries(buildNavGroups(entries, "decisions"));
    expect(flat.map((entry) => entry.slug)).toEqual([
      "",
      "decisions",
      "decisions/adrs",
      "decisions/rfcs/rfc-0001-appearance-configuration",
      "decisions/adrs/adr-0003-core-workspace-topology",
      "projects/bitty/user-guide/readme",
      "projects/bitty/specifications/lua-runtime-rfc",
      "development/toolchain-policy",
    ]);
  });
});

describe("pagerFor", () => {
  const groups = buildNavGroups(entries, "");

  test("takes neighbours from the sidebar reading order", () => {
    const pager = pagerFor(
      groups,
      "decisions/adrs/adr-0003-core-workspace-topology",
    );
    expect(pager.previous?.slug).toBe(
      "decisions/rfcs/rfc-0001-appearance-configuration",
    );
    expect(pager.next?.slug).toBe("projects/bitty/user-guide/readme");
  });

  test("stops at both ends", () => {
    expect(pagerFor(groups, "").previous).toBeNull();
    expect(pagerFor(groups, "").next?.slug).toBe("decisions");
    expect(pagerFor(groups, "development/toolchain-policy").next).toBeNull();
  });

  test("returns no pager for a page outside the navigation model", () => {
    expect(pagerFor(groups, "handoff/readme")).toEqual({
      previous: null,
      next: null,
    });
  });
});

describe("renderSidebarTree", () => {
  const wrap = (fragment: string): string =>
    `<nav class="docs-sidebar" aria-label="Documentation">${fragment}</nav>`;

  test("renders two list levels only, with the current group open", () => {
    const html = renderSidebarTree(
      buildNavGroups(
        entries,
        "decisions/adrs/adr-0003-core-workspace-topology",
      ),
      "stable",
      "decisions/adrs/adr-0003-core-workspace-topology",
    );
    expect(sidebarListDepth(wrap(html))).toBe(2);
    expect(
      html.match(/<details class="docs-nav-group-details" open>/g),
    ).toHaveLength(1);
    expect(html).toContain(
      'href="/docs/stable/decisions/adrs/adr-0003-core-workspace-topology/"',
    );
  });

  test("labels a folder that is also a page with its own title, never Contents", () => {
    const html = renderSidebarTree(
      buildNavGroups(entries, "decisions"),
      "latest",
      "decisions",
    );
    expect(html).toContain(
      'href="/docs/latest/decisions/" aria-current="page">Decision register</a>',
    );
    expect(html).toContain(
      'href="/docs/latest/projects/bitty/specifications/lua-runtime-rfc/">Lua Runtime</a>',
    );
    expect(html).not.toContain("Contents");
  });

  test("emits exactly one aria-current, on the current page link", () => {
    const slug = "projects/bitty/user-guide/readme";
    const html = renderSidebarTree(
      buildNavGroups(entries, slug),
      "0.1.0",
      slug,
    );
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(`href="/docs/0.1.0/${slug}/" aria-current="page"`);
  });

  test("renders without JS affordances beyond native details/summary", () => {
    const html = renderSidebarTree(buildNavGroups(entries, ""), "latest", "");
    expect(html).not.toMatch(/on(click|toggle|load)=/i);
    expect(html).toContain("<details");
    expect(html).toContain("<summary>");
  });
});

describe("buildBreadcrumbs", () => {
  test("derives the trail from the route, links only rendered routes", () => {
    const crumbs = buildBreadcrumbs({
      version: "latest",
      slug: "decisions/adrs/adr-0003-core-workspace-topology",
      titles,
    });
    expect(crumbs).toEqual([
      { label: DOCS_ROOT_LABEL, href: "/docs/latest/" },
      { label: "Concepts", href: null },
      { label: "Decision register", href: "/docs/latest/decisions/" },
      {
        label: "Architecture decision records",
        href: "/docs/latest/decisions/adrs/",
      },
      { label: "Core Workspace Topology", href: null },
    ]);
  });

  test("keeps a step without a page as plain text", () => {
    const crumbs = buildBreadcrumbs({
      version: "0.1.0",
      slug: "projects/bitty/specifications/lua-runtime-rfc",
      titles,
    });
    expect(crumbs.map((crumb) => crumb.href)).toEqual([
      "/docs/0.1.0/",
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Docs",
      "Reference",
      "Projects",
      "Bitty",
      "Specifications",
      "Lua Runtime",
    ]);
  });

  test("names the revision index without linking to itself", () => {
    const crumbs = buildBreadcrumbs({ version: "latest", slug: "", titles });
    expect(crumbs).toEqual([
      { label: "Docs", href: null },
      { label: "Overview", href: null },
    ]);
  });
});

describe("hrefFor", () => {
  test("is version-aware and handles the revision index", () => {
    expect(hrefFor("latest", "")).toBe("/docs/latest/");
    expect(hrefFor("0.1.0", "decisions")).toBe("/docs/0.1.0/decisions/");
  });
});
