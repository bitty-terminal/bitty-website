import { getAllManualDocEntries, loadManualManifest } from "./manualDocs.ts";

export type ManualLocale = "en" | "zh-CN";

export function getManualPaths(locale: ManualLocale) {
  const entries = getAllManualDocEntries(loadManualManifest());
  return [
    { params: { slug: undefined }, props: { locale, slug: "" } },
    ...entries.map((entry) => ({
      params: { slug: entry.fullSlug },
      props: { locale, slug: entry.fullSlug },
    })),
  ];
}
