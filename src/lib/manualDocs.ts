import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface ManualManifestItem {
  readonly slug: string;
  readonly title: string;
  readonly path: string;
}

export interface ManualManifestSection {
  readonly id: string;
  readonly title: string;
  readonly items: readonly ManualManifestItem[];
}

export interface ManualManifestDistribution {
  readonly package: string;
  readonly cdn_base: string;
  readonly canonical_prefix: string;
  readonly per_locale_bundle?: string;
  readonly versioned_prefix?: string;
}

export interface ManualManifest {
  readonly name: string;
  readonly version: string;
  readonly default_locale: string;
  readonly locales: readonly string[];
  readonly distribution: ManualManifestDistribution;
  readonly sections: readonly ManualManifestSection[];
}

export interface ManualDocEntry {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly slug: string;
  readonly fullSlug: string;
  readonly title: string;
  readonly path: string;
  readonly order: number;
}

export interface ManualNavGroup {
  readonly id: string;
  readonly label: string;
  readonly entries: readonly ManualDocEntry[];
  readonly isCurrent: boolean;
}

export interface ManualPagerLink {
  readonly slug: string;
  readonly title: string;
  readonly href: string;
}

export interface ManualPager {
  readonly previous: ManualPagerLink | null;
  readonly next: ManualPagerLink | null;
}

export interface ManualBreadcrumb {
  readonly locale: string;
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly title: string;
  readonly r2Key: string;
  readonly r2Url: string;
}

let cachedManifest: ManualManifest | null = null;

export function loadManualManifest(baseDir?: string): ManualManifest {
  if (cachedManifest && !baseDir) {
    return cachedManifest;
  }
  const manifestPath = baseDir
    ? join(baseDir, "manifest.json")
    : join(process.cwd(), "src/content/manual/manifest.json");

  const raw = readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as ManualManifest;
  if (!baseDir) {
    cachedManifest = parsed;
  }
  return parsed;
}

export function getAllManualDocEntries(
  manifest?: ManualManifest,
): readonly ManualDocEntry[] {
  const m = manifest ?? loadManualManifest();
  const entries: ManualDocEntry[] = [];
  let order = 0;

  for (const section of m.sections) {
    for (const item of section.items) {
      entries.push({
        sectionId: section.id,
        sectionTitle: section.title,
        slug: item.slug,
        fullSlug: `${section.id}/${item.slug}`,
        title: item.title,
        path: item.path,
        order: order++,
      });
    }
  }

  return entries;
}

export function getManualNavGroups(
  currentFullSlug: string,
  _version = "latest",
  manifest?: ManualManifest,
): readonly ManualNavGroup[] {
  const m = manifest ?? loadManualManifest();
  const allEntries = getAllManualDocEntries(m);

  return m.sections.map((section) => {
    const entries = allEntries.filter((e) => e.sectionId === section.id);
    const isCurrent = entries.some(
      (e) =>
        e.fullSlug === currentFullSlug ||
        (currentFullSlug === "" && e.order === 0),
    );
    return {
      id: section.id,
      label: section.title,
      entries,
      isCurrent,
    };
  });
}

export function getManualPager(
  currentFullSlug: string,
  version = "latest",
  manifest?: ManualManifest,
): ManualPager {
  const allEntries = getAllManualDocEntries(manifest);
  const activeSlug =
    currentFullSlug === "" ? (allEntries[0]?.fullSlug ?? "") : currentFullSlug;
  const currentIndex = allEntries.findIndex((e) => e.fullSlug === activeSlug);

  if (currentIndex === -1) {
    return { previous: null, next: null };
  }

  const prevEntry = currentIndex > 0 ? allEntries[currentIndex - 1] : null;
  const nextEntry =
    currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null;

  return {
    previous: prevEntry
      ? {
          slug: prevEntry.fullSlug,
          title: prevEntry.title,
          href: `/docs/${version}/${prevEntry.fullSlug}/`,
        }
      : null,
    next: nextEntry
      ? {
          slug: nextEntry.fullSlug,
          title: nextEntry.title,
          href: `/docs/${version}/${nextEntry.fullSlug}/`,
        }
      : null,
  };
}

export function getManualBreadcrumb(
  currentFullSlug: string,
  locale = "en",
  manifest?: ManualManifest,
): ManualBreadcrumb | null {
  const m = manifest ?? loadManualManifest();
  const allEntries = getAllManualDocEntries(m);
  const activeSlug =
    currentFullSlug === "" ? (allEntries[0]?.fullSlug ?? "") : currentFullSlug;
  const entry = allEntries.find((e) => e.fullSlug === activeSlug);

  if (!entry) {
    return null;
  }

  const cdnBase = m.distribution.cdn_base || "https://cdn.bitty.run/manual";
  const r2Key = `${entry.path}`;
  // The published manual keys are `manual/<locale>/<path>`; the legacy
  // `manual/bitty-manual/...` prefix is not served by the CDN origin.
  const r2Url = `${cdnBase}/${locale}/${entry.path}`;

  return {
    locale,
    sectionId: entry.sectionId,
    sectionTitle: entry.sectionTitle,
    title: entry.title,
    r2Key,
    r2Url,
  };
}

export function readManualRawMarkdown(
  entryPath: string,
  locale = "en",
  baseDir?: string,
): string {
  const dir = baseDir
    ? join(baseDir, locale)
    : join(process.cwd(), "src/content/manual", locale);
  const filePath = join(dir, entryPath);
  return readFileSync(filePath, "utf8");
}
