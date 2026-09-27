/**
 * Navigation-manifest fixtures (`./docsNavGroups.ts`).
 *
 * Pins the website#96 contract: at most six reader-intent groups, every
 * routable category owned exactly once, `projects/<project>/<topic>` grouped
 * by the topic, and an unknown route failing closed instead of silently
 * disappearing from the sidebar.
 */

import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NAV_GROUPS,
  groupForRoute,
  navGroupLabel,
  routeSegments,
} from "./docsNavGroups.ts";
import { ROUTABLE_CATEGORIES } from "./docsRoutes.ts";

/** The aggregate mirror, resolved without embedding a checkout path. */
const MIRROR_PROJECTS_ROOT = fileURLToPath(
  new URL("../content/docs/docs/projects", import.meta.url),
);

/** `{project, topic}` for every direct topic directory under a project mount. */
function projectTopicSegments(
  root: string,
): { project: string; topic: string }[] {
  const topics: { project: string; topic: string }[] = [];
  for (const project of readdirSync(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const projectDir = join(root, project.name);
    for (const topic of readdirSync(projectDir, { withFileTypes: true })) {
      if (!topic.isDirectory()) continue;
      topics.push({ project: project.name, topic: topic.name });
    }
  }
  return topics.sort((a, b) =>
    `${a.project}/${a.topic}`.localeCompare(`${b.project}/${b.topic}`),
  );
}

const GROUP_BY_ID = new Map(NAV_GROUPS.map((group) => [group.id, group]));

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
    // No category is declared by two groups.
    expect(new Set(owned).size).toBe(owned.length);
    // Every routable category is owned by exactly one group. `NAV_GROUPS` may
    // additionally own project *topic segments* (`sdk`, `packaging`,
    // `runtime`, ...) that are not top-level route categories, so this is a
    // superset check; the consumed-topic check below covers those segments.
    for (const category of ROUTABLE_CATEGORIES) {
      expect(
        owned.filter((candidate) => candidate === category),
        `category "${category}" must be owned by exactly one group`,
      ).toHaveLength(1);
    }
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

describe("consumed topic trees map to a group (#98)", () => {
  const topics = projectTopicSegments(MIRROR_PROJECTS_ROOT);

  test("the mirror declares at least the plugin topics T6 landed", () => {
    const names = topics.map((entry) => entry.topic);
    // Guards the check below against a silently empty read (which would make
    // it pass vacuously if the mirror or the mount moved).
    expect(names).toContain("sdk");
    expect(names).toContain("packaging");
    expect(names).toContain("runtime");
  });

  test("every consumed topic tree is owned by a group, never the container fallback", () => {
    for (const { project, topic } of topics) {
      const route = `projects/${project}/${topic}/page`;
      const group = groupForRoute(route);
      expect(
        GROUP_BY_ID.get(group)?.categories,
        `topic "${project}/${topic}" resolves to group "${group}", which does not own it`,
      ).toContain(topic);
    }
  });

  test("the plugin topics resolve to the reviewed groups", () => {
    expect(groupForRoute("projects/plugins/sdk/reference/env")).toBe(
      "reference",
    );
    expect(
      groupForRoute("projects/plugins/packaging/plugin-lifecycle-rfc"),
    ).toBe("extending");
    expect(
      groupForRoute("projects/plugins/runtime/plugin-host-runtime-rfc"),
    ).toBe("concepts");
  });
});
