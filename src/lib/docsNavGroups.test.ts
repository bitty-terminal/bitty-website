/**
 * Navigation-manifest fixtures (`./docsNavGroups.ts`).
 *
 * Pins the website#96 contract: at most six reader-intent groups, every
 * routable category owned exactly once, `projects/<project>/<topic>` grouped
 * by the topic, and an unknown route failing closed instead of silently
 * disappearing from the sidebar.
 */

import { describe, expect, test } from "bun:test";

import {
  NAV_GROUPS,
  groupForRoute,
  navGroupLabel,
  routeSegments,
} from "./docsNavGroups.ts";
import { ROUTABLE_CATEGORIES } from "./docsRoutes.ts";

describe("NAV_GROUPS", () => {
  test("caps the top level at the six reader-intent groups", () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual([
      "Overview",
      "Concepts",
      "Using",
      "Extending",
      "Reference",
      "Project",
    ]);
  });

  test("owns every routable category exactly once", () => {
    const owned = NAV_GROUPS.flatMap((group) => group.categories);
    expect([...owned].sort()).toEqual([...ROUTABLE_CATEGORIES].sort());
    expect(new Set(owned).size).toBe(owned.length);
  });
});

describe("groupForRoute", () => {
  test("groups top-level topic routes by their category", () => {
    expect(groupForRoute("decisions")).toBe("concepts");
    expect(groupForRoute("decisions/adrs/adr-0006-os-env-policy")).toBe(
      "concepts",
    );
    expect(groupForRoute("security/threat-model")).toBe("reference");
    expect(groupForRoute("development/toolchain-policy")).toBe("project");
    expect(groupForRoute("roadmap/readme")).toBe("overview");
  });

  test("looks through the projects container to the topic segment", () => {
    expect(groupForRoute("projects/bitty/specifications/lua-runtime-rfc")).toBe(
      "reference",
    );
    expect(groupForRoute("projects/bitty/user-guide/readme")).toBe("using");
    expect(groupForRoute("projects/bitty/extensibility/plugin-system")).toBe(
      "extending",
    );
    expect(groupForRoute("projects/bitty/architecture/overview")).toBe(
      "concepts",
    );
    expect(groupForRoute("projects/bitty/product/vision")).toBe("overview");
  });

  test("keeps the container group for a route without its own topic", () => {
    expect(groupForRoute("projects")).toBe("project");
    expect(groupForRoute("projects/bitty")).toBe("project");
  });

  test("maps the revision index to the entry-point group", () => {
    expect(groupForRoute("")).toBe("overview");
  });

  test("fails closed when no group owns the route", () => {
    expect(() => groupForRoute("unmapped-topic/page")).toThrow(
      /no navigation group/,
    );
  });
});

describe("routeSegments", () => {
  test("splits a slug and drops empty segments", () => {
    expect(routeSegments("")).toEqual([]);
    expect(routeSegments("decisions/adrs/readme")).toEqual([
      "decisions",
      "adrs",
      "readme",
    ]);
    expect(routeSegments("a//b/")).toEqual(["a", "b"]);
  });
});

describe("navGroupLabel", () => {
  test("resolves the declared label", () => {
    expect(navGroupLabel("using")).toBe("Using");
    expect(navGroupLabel("project")).toBe("Project");
  });
});
