import { describe, expect, test } from "bun:test";

import {
  extractOfficialPluginIds,
  extractPublishedVersion,
  extractStatus,
  extractSummary,
} from "./extensionCatalog.ts";

describe("extractStatus", () => {
  test("reads the published callout", () => {
    const markdown = [
      "# graphics (native extension)",
      "",
      "Bounded image decode.",
      "",
      "## Install status",
      "",
      "> Published — `graphics 0.0.24` has a live CDN tarball.",
      "",
      "## Lua / host surface",
    ].join("\n");
    expect(extractStatus(markdown)).toBe("published");
  });

  test("reads the unpublished callout", () => {
    const markdown = [
      "# ipc (native extension)",
      "",
      "Bridge.",
      "",
      "## Install status",
      "",
      "> **Unpublished** — CDN probes return 404.",
    ].join("\n");
    expect(extractStatus(markdown)).toBe("unpublished");
  });

  test("reads the localized Chinese callout", () => {
    const markdown = [
      "# graphics (原生扩展)",
      "",
      "## 安装状态",
      "",
      "> 已发布——`graphics 0.0.25` 已上线。",
    ].join("\n");
    expect(extractStatus(markdown)).toBe("published");

    const unpublished = [
      "# ipc (原生扩展)",
      "",
      "## 安装状态",
      "",
      "> 未发布——CDN 探针返回 404。",
    ].join("\n");
    expect(extractStatus(unpublished)).toBe("unpublished");
  });

  test("returns unknown without a status section", () => {
    expect(extractStatus("# plugin\n\nNo status here.")).toBe("unknown");
    expect(extractStatus("## Install status\n\nSomething else entirely.")).toBe(
      "unknown",
    );
  });
});

describe("extractPublishedVersion", () => {
  test("returns the version from a published callout", () => {
    const markdown = [
      "# graphics (native extension)",
      "",
      "## Install status",
      "",
      "> Published — `graphics 0.0.25` has live CDN tarballs.",
    ].join("\n");
    expect(extractPublishedVersion(markdown)).toBe("0.0.25");
  });

  test("returns null for unpublished or unknown pages", () => {
    expect(
      extractPublishedVersion(
        "# ipc\n\n## Install status\n\n> Unpublished — 404.",
      ),
    ).toBeNull();
    expect(extractPublishedVersion("# ipc\n\nNo status.")).toBeNull();
  });
});

describe("extractOfficialPluginIds", () => {
  test("reads the official catalog table in order", () => {
    const markdown = [
      "| Official id | Version |",
      "| :-- | :-- |",
      "| `bitty-featured.activity` | 0.0.1 |",
      "| `bitty-terminal.dashboard` | 0.0.1 |",
      "| `bitty-terminal.palette` | 0.0.1 |",
      "",
      "| Command | Meaning |",
      "| `bitty plugin list` | list |",
    ].join("\n");
    expect(extractOfficialPluginIds(markdown)).toEqual([
      "bitty-featured.activity",
      "bitty-terminal.dashboard",
      "bitty-terminal.palette",
    ]);
  });
});

describe("extractSummary", () => {
  test("uses the first prose sentence and strips markdown", () => {
    const markdown = [
      "# graphics (native extension)",
      "",
      "Bounded PNG decode plus the raster subset for [inline images](https://example.test). `Placement` policy stays in Core.",
      "",
      "## Install status",
    ].join("\n");
    expect(extractSummary(markdown)).toBe(
      "Bounded PNG decode plus the raster subset for inline images.",
    );
  });

  test("keeps identifiers inside code spans intact", () => {
    const markdown = [
      "# a11y (native extension)",
      "",
      "Ingests `Adapter::ingest_host` and exposes `Adapter::expose_to` with `src/kitty_decode.rs`.",
    ].join("\n");
    expect(extractSummary(markdown)).toBe(
      "Ingests Adapter::ingest_host and exposes Adapter::expose_to with src/kitty_decode.rs.",
    );
  });

  test("skips lists, quotes, code fences, and headings", () => {
    const markdown = [
      "# entry",
      "",
      "- list item",
      "",
      "> quote",
      "",
      "```sh",
      "command",
      "```",
      "",
      "Real prose starts here.",
    ].join("\n");
    expect(extractSummary(markdown)).toBe("Real prose starts here.");
  });

  test("truncates a long sentence at a word boundary", () => {
    const markdown = `# entry\n\n${"word ".repeat(60)}end.`;
    const summary = extractSummary(markdown);
    expect(summary.length).toBeLessThanOrEqual(171);
    expect(summary.endsWith("…")).toBe(true);
  });

  test("returns an empty string when there is no prose", () => {
    expect(extractSummary("# entry\n\n## Section\n")).toBe("");
  });
});
