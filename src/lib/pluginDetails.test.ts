import { describe, expect, test } from "bun:test";

import {
  OFFICIAL_PLUGIN_SLUGS,
  getAllOfficialPlugins,
  getOfficialPluginBySlug,
  getOfficialPluginPaths,
  getPluginDetailHref,
} from "./pluginDetails.ts";

describe("pluginDetails", () => {
  test("contains all 13 official plugins with valid metadata", () => {
    const plugins = getAllOfficialPlugins();
    expect(plugins).toHaveLength(13);
    expect(OFFICIAL_PLUGIN_SLUGS).toEqual([
      "activity",
      "bar",
      "beacon",
      "composer",
      "copy-mode",
      "dashboard",
      "devtools",
      "file-manager",
      "git-panel",
      "help",
      "history",
      "palette",
      "search",
    ]);

    for (const plugin of plugins) {
      expect(plugin.id.length).toBeGreaterThan(0);
      expect(plugin.name.length).toBeGreaterThan(0);
      expect(plugin.version.length).toBeGreaterThan(0);
      expect(plugin.repository).toBe(
        `https://github.com/bitty-terminal/${plugin.slug}`,
      );
      expect(plugin.compat.bitty.length).toBeGreaterThan(0);
      expect(plugin.compat.pluginApi.length).toBeGreaterThan(0);
      expect(plugin.capabilities.length).toBeGreaterThan(0);
      expect(plugin.commands.length).toBeGreaterThan(0);
      expect(plugin.overview.summary.length).toBeGreaterThan(0);
    }
  });

  test("looks up plugins by slug and builds localized paths", () => {
    const bar = getOfficialPluginBySlug("bar");
    expect(bar?.id).toBe("bitty-terminal.bar");
    expect(getOfficialPluginBySlug("nonexistent")).toBeUndefined();
    expect(getOfficialPluginPaths()).toHaveLength(13);
    expect(getPluginDetailHref("en", "bar")).toBe("/plugins/bar/");
    expect(getPluginDetailHref("zh-CN", "bar")).toBe("/zh-CN/plugins/bar/");
  });

  test("does not leak host-specific filesystem paths", () => {
    const serialized = JSON.stringify(getAllOfficialPlugins());
    expect(serialized).not.toMatch(/\/(?:home|Users|mnt)\//u);
  });
});
