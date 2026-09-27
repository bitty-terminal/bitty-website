/**
 * Page badge tests (bitty-website#97).
 *
 * The docs header states status, audience, and — when the metadata says a
 * contract is not implemented — that fact. Badges are derived from
 * frontmatter only; the canonical document body is never parsed or rewritten.
 */

import { describe, expect, test } from "bun:test";

import { AUDIENCE_LABELS, pageBadges } from "./pageBadges.ts";

describe("pageBadges", () => {
  test("renders status, audience, and the implementation badge", () => {
    expect(
      pageBadges({
        sourcePath: "docs/projects/bitty/specifications/plugin-platform-rfc.md",
        audience: "plugin-author",
        document_type: "specification",
        website_publish: true,
        status: "draft",
      }),
    ).toEqual([
      { id: "status", label: "Draft", value: "draft" },
      { id: "audience", label: "Plugin author", value: "plugin-author" },
      {
        id: "implementation",
        label: "Contract not implemented",
        value: "specification",
      },
    ]);
  });

  test("omits the implementation badge for a stable contract", () => {
    expect(
      pageBadges({
        sourcePath: "docs/projects/bitty/configuration/themes.md",
        audience: "user",
        document_type: "reference",
        website_publish: true,
        status: "stable",
      }).map((badge) => badge.id),
    ).toEqual(["status", "audience"]);
  });

  test("labels every audience of the shared schema", () => {
    for (const audience of Object.keys(AUDIENCE_LABELS)) {
      const badges = pageBadges({
        sourcePath: "docs/projects/bitty/user-guide/readme.md",
        audience,
        document_type: "index",
        website_publish: true,
        status: "accepted",
      });
      expect(badges[1]?.label.length).toBeGreaterThan(0);
    }
  });
});
