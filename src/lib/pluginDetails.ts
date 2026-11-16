import officialPluginsData from "../data/officialPlugins.json";
import { localePath, type SiteLocale } from "./i18n.ts";

export interface PluginCompat {
  readonly bitty: string;
  readonly pluginApi: string;
}

export interface PluginCommand {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface PluginKeybinding {
  readonly chord: string;
  readonly command: string;
  readonly context: string;
}

export interface PluginSetting {
  readonly key: string;
  readonly type: string;
  readonly default: string;
  readonly description: string;
}

export interface PluginOverview {
  readonly summary: string;
  readonly highlights: readonly string[];
}

export interface OfficialPluginDetail {
  readonly slug: string;
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly license: string;
  readonly repository: string;
  readonly compat: PluginCompat;
  readonly capabilities: readonly string[];
  readonly commands: readonly PluginCommand[];
  readonly keybindings: readonly PluginKeybinding[];
  readonly settings: readonly PluginSetting[];
  readonly overview: PluginOverview;
}

const OFFICIAL_PLUGINS: readonly OfficialPluginDetail[] =
  officialPluginsData as readonly OfficialPluginDetail[];

export const OFFICIAL_PLUGIN_SLUGS: readonly string[] = OFFICIAL_PLUGINS.map(
  (plugin) => plugin.slug,
);

export function getAllOfficialPlugins(): readonly OfficialPluginDetail[] {
  return OFFICIAL_PLUGINS;
}

export function getOfficialPluginBySlug(
  slug: string,
): OfficialPluginDetail | undefined {
  return OFFICIAL_PLUGINS.find((plugin) => plugin.slug === slug);
}

export function getOfficialPluginPaths(): Array<{ params: { slug: string } }> {
  return OFFICIAL_PLUGINS.map((plugin) => ({
    params: { slug: plugin.slug },
  }));
}

export function getPluginDetailHref(locale: SiteLocale, slug: string): string {
  return localePath(locale, `/plugins/${slug}/`);
}
