/**
 * Docs entry fixtures (`./docsEntries.ts`).
 *
 * Pins the CTX-0050 contract that the sidebar, breadcrumbs, and pager derive
 * the same canonical slug and the same published entry set from the
 * collection, and that a source path outside the mirror fails closed.
 */

import { describe, expect, test } from "bun:test";

import {
  MIRROR_MARKER,
  publishedEntriesFrom,
  sidebarEntriesFrom,
  slugFromSourceFile,
  sourcePathFromFilePath,
  type DocsEntryLike,
} from "./docsEntries.ts";

const mirror = (relative: string): string => `${MIRROR_MARKER}${relative}`;

describe("sourcePathFromFilePath", () => {
  test("returns the source path below the mirror marker", () => {
    expect(
      sourcePathFromFilePath(
        mirror("docs/decisions/index.md"),
        "docs/decisions/index.md",
      ),
    ).toBe("docs/decisions/index.md");
  });

  test("accepts an absolute build path", () => {
    expect(
      sourcePathFromFilePath(
        `/build/${mirror("docs/reference/readme.md")}`,
        "id",
      ),
    ).toBe("docs/reference/readme.md");
  });

  test("fails closed outside the mirror", () => {
    expect(() =>
      sourcePathFromFilePath("elsewhere/docs/index.md", "docs/index.md"),
    ).toThrow(/outside/);
  });
});

describe("slugFromSourceFile", () => {
  test("maps mirror sources to canonical slugs", () => {
    expect(slugFromSourceFile(mirror("docs/README.md"), "docs/README.md")).toBe(
      "",
    );
    expect(
      slugFromSourceFile(mirror("docs/decisions/index.md"), "decisions/index"),
    ).toBe("decisions");
    expect(
      slugFromSourceFile(
        mirror("docs/decisions/README.md"),
        "decisions/README",
      ),
    ).toBe("decisions/readme");
    expect(
      slugFromSourceFile(
        mirror("docs/projects/bitty/specifications/lua-runtime-rfc.md"),
        "projects/bitty/specifications/lua-runtime-rfc",
      ),
    ).toBe("projects/bitty/specifications/lua-runtime-rfc");
  });

  test("fails closed without a file path", () => {
    expect(() => slugFromSourceFile(undefined, "docs/decisions/index")).toThrow(
      /no filePath/,
    );
    expect(() => slugFromSourceFile("", "docs/decisions/index")).toThrow(
      /no filePath/,
    );
  });
});

describe("sidebarEntriesFrom", () => {
  const entries: DocsEntryLike[] = [
    {
      id: "roadmap/README",
      filePath: mirror("docs/roadmap/README.md"),
      data: {
        title: "Roadmap",
        sidebar_order: 1,
        audience: "user",
        document_type: "index",
        status: "accepted",
        website_publish: true,
      },
    },
    {
      id: "handoff/README",
      filePath: mirror("docs/handoff/README.md"),
      data: {
        title: "Handoff",
        sidebar_order: 2,
        audience: "user",
        document_type: "index",
        status: "accepted",
        website_publish: false,
      },
    },
  ];

  test("keeps published entries with their canonical slug, title, and order", () => {
    expect(sidebarEntriesFrom(entries)).toEqual([
      { slug: "roadmap/readme", title: "Roadmap", order: 1 },
    ]);
  });

  test("returns an empty list when nothing is published", () => {
    expect(
      sidebarEntriesFrom(
        entries.map((entry) => ({
          ...entry,
          data: { ...entry.data, website_publish: false },
        })),
      ),
    ).toEqual([]);
  });

  test("drops a page that requests publication without being eligible", () => {
    // website#97: `website_publish: true` alone no longer routes a page. The
    // demotion is recorded in the docs-side flip list, so the content layer
    // filters it out exactly like the route page does.
    const demoted: DocsEntryLike = {
      id: "decisions/index",
      filePath: mirror("docs/decisions/index.md"),
      data: {
        title: "Decision register",
        sidebar_order: 3,
        audience: "maintainer",
        document_type: "register",
        status: "accepted",
        website_publish: true,
      },
    };
    expect(sidebarEntriesFrom([...entries, demoted])).toEqual([
      { slug: "roadmap/readme", title: "Roadmap", order: 1 },
    ]);
  });
});

describe("publishedEntriesFrom", () => {
  test("derives the published set from the shared publication policy", () => {
    const entries: DocsEntryLike[] = [
      {
        id: "roadmap/README",
        filePath: mirror("docs/roadmap/README.md"),
        data: {
          title: "Roadmap",
          sidebar_order: 1,
          audience: "mixed",
          document_type: "index",
          status: "accepted",
          website_publish: true,
        },
      },
      {
        id: "security/overview",
        filePath: mirror("docs/security/overview.md"),
        data: {
          title: "Security overview",
          sidebar_order: 2,
          audience: "security-reviewer",
          document_type: "policy",
          status: "normative",
          website_publish: true,
        },
      },
    ];
    expect(publishedEntriesFrom(entries).map((entry) => entry.id)).toEqual([
      "roadmap/README",
    ]);
  });
});
