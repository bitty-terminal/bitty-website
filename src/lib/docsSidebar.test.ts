/**
 * W3 fixtures for the sidebar tree model (`./docsSidebar.ts`).
 *
 * Pins the website#86 contract: nested multi-level trees derived from
 * route paths, machine prefixes stripped at render time only (canonical
 * titles/slugs untouched), version-aware links, `aria-current="page"` on
 * exactly the current page, and native `<details>` disclosure (no-JS,
 * keyboard operable).
 */

import { describe, expect, test } from "bun:test";

import {
  buildSidebarTree,
  displayTitle,
  hrefFor,
  markCurrent,
  renderSidebarTree,
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

describe("buildSidebarTree", () => {
  const entries: SidebarEntry[] = [
    { slug: "decisions", title: "Decision register", order: 1 },
    {
      slug: "decisions/adrs",
      title: "Architecture decision records",
      order: 2,
    },
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
  ];

  test("nests three levels deep from route paths", () => {
    const tree = buildSidebarTree(entries);
    const decisions = tree.find(
      (node) => node.segments.join("/") === "decisions",
    );
    expect(decisions).toBeDefined();
    expect(decisions?.page?.slug).toBe("decisions");
    const names = (decisions?.children ?? []).map((kid) =>
      kid.segments.join("/"),
    );
    expect(names).toContain("decisions/adrs");
    expect(names).toContain("decisions/rfcs");
    const adrs = decisions?.children.find(
      (kid) => kid.segments.join("/") === "decisions/adrs",
    );
    expect(adrs?.children.map((kid) => kid.segments.join("/"))).toContain(
      "decisions/adrs/adr-0003-core-workspace-topology",
    );
  });

  test("category grouping alone is insufficient: same-category pages split by path", () => {
    const tree = buildSidebarTree(entries);
    const top = tree.map((node) => node.segments.join("/"));
    expect(top).toContain("decisions");
    expect(top).toContain("development");
    // decisions/adrs and decisions/rfcs are distinct subtrees, not one flat list.
    const decisions = tree.find(
      (node) => node.segments.join("/") === "decisions",
    );
    expect((decisions?.children ?? []).length).toBeGreaterThan(1);
  });
});

describe("markCurrent + renderSidebarTree", () => {
  const entries: SidebarEntry[] = [
    { slug: "decisions", title: "Decision register", order: 1 },
    {
      slug: "decisions/adrs/adr-0003-core-workspace-topology",
      title: "ADR 0003 - Core Workspace Topology",
      order: 33,
    },
  ];

  test("marks ancestry open and exactly one aria-current", () => {
    const tree = markCurrent(
      buildSidebarTree(entries),
      "decisions/adrs/adr-0003-core-workspace-topology",
    );
    const html = renderSidebarTree(tree, "stable");
    expect(html).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)?.length).toBe(1);
    // Ancestor disclosures render open; canonical slug preserved in href.
    expect(html).toContain(
      'href="/docs/stable/decisions/adrs/adr-0003-core-workspace-topology/"',
    );
    expect(html.match(/<details class="docs-nav-sub" open>/g)?.length).toBe(2);
    // Rendered label strips the machine prefix; canonical title is untouched.
    expect(html).toContain(">Core Workspace Topology</a>");
    expect(html).not.toContain("ADR 0003");
  });

  test("version-aware links", () => {
    expect(hrefFor("latest", "")).toBe("/docs/latest/");
    expect(hrefFor("0.1.0", "decisions")).toBe("/docs/0.1.0/decisions/");
  });

  test("renders without JS affordances (native details/summary only)", () => {
    const tree = markCurrent(buildSidebarTree(entries), "decisions");
    const html = renderSidebarTree(tree, "latest");
    expect(html).not.toMatch(/on(click|toggle|load)=/i);
    expect(html).toContain("<details");
    expect(html).toContain("<summary>");
  });
});
