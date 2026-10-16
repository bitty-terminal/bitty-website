import { describe, expect, test } from "bun:test";
import {
  getAllManualDocEntries,
  getManualBreadcrumb,
  getManualNavGroups,
  getManualPager,
  loadManualManifest,
  readManualRawMarkdown,
} from "./manualDocs.ts";

describe("manualDocs", () => {
  test("loadManualManifest reads bitty-manual manifest", () => {
    const manifest = loadManualManifest();
    expect(manifest.name).toBe("Bitty Manual");
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.locales).toContain("en");
    expect(manifest.locales).toContain("zh-CN");
    expect(manifest.sections.length).toBe(6);
  });

  test("getAllManualDocEntries flattens all 41 items in manifest order", () => {
    const entries = getAllManualDocEntries();
    const first = entries[0];
    const last = entries[entries.length - 1];
    expect(first?.fullSlug).toBe("getting-started/quickstart");
    expect(first?.title).toBe("Quick Start Guide");
    expect(last?.fullSlug).toBe("faq/troubleshooting");
  });

  test("getManualNavGroups marks active section as isCurrent", () => {
    const groups = getManualNavGroups("plugins/composer", "latest");
    expect(groups.length).toBe(6);

    const pluginGroup = groups.find((g) => g.id === "plugins");
    expect(pluginGroup?.isCurrent).toBe(true);

    const configGroup = groups.find((g) => g.id === "configuration");
    expect(configGroup?.isCurrent).toBe(false);
  });

  test("getManualPager returns correct linear neighbours", () => {
    const firstPager = getManualPager("getting-started/quickstart", "latest");
    expect(firstPager.previous).toBeNull();
    expect(firstPager.next?.slug).toBe("getting-started/cli");
    expect(firstPager.next?.href).toBe("/docs/latest/getting-started/cli/");

    const middlePager = getManualPager("getting-started/cli", "latest");
    expect(middlePager.previous?.slug).toBe("getting-started/quickstart");
    expect(middlePager.next?.slug).toBe("configuration/overview");

    const lastPager = getManualPager("faq/troubleshooting", "latest");
    expect(lastPager.next).toBeNull();
    expect(lastPager.previous?.slug).toBe("api/system");
  });

  test("getManualBreadcrumb returns correct CDN R2 metadata", () => {
    const bc = getManualBreadcrumb("plugins/upstream-components", "en");
    expect(bc).not.toBeNull();
    expect(bc?.sectionTitle).toBe("Plugin Architecture & Development");
    expect(bc?.title).toBe("Native Component Boundary");
    expect(bc?.r2Key).toBe("plugins/upstream-components.md");
    expect(bc?.r2Url).toBe(
      "https://cdn.bitty.run/manual/bitty-manual/en/plugins/upstream-components.md",
    );
  });

  test("readManualRawMarkdown reads markdown files in both en and zh-CN", () => {
    const enText = readManualRawMarkdown("getting-started/quickstart.md", "en");
    expect(enText).toContain("# Quick Start Guide");

    const zhText = readManualRawMarkdown(
      "getting-started/quickstart.md",
      "zh-CN",
    );
    expect(zhText.length).toBeGreaterThan(0);
  });
});
