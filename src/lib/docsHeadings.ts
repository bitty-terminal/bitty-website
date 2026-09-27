/**
 * Heading guard for versioned docs pages (CTX-0035, extended by CTX-0050).
 *
 * Two jobs, both at build time:
 *
 * 1. Every docs page template owns the single `<h1>` (the entry title), so
 *    Markdown content headings are demoted one level (`h1`→`h2`, …, `h5`→
 *    `h6`, `h6` stays). Canonical text, order, and anchor ids are untouched —
 *    only the depth changes, keeping one `h1` per page and a logical heading
 *    order no matter how many top-level headings the source document carries.
 *
 * 2. Corpus documents open with `# <title>`, which the demotion turns into an
 *    `h2` that prints the page title a second time (website#74). The plugin
 *    drops that leading heading when its text matches the entry title exactly
 *    (after whitespace normalization), taking its TOC entry with it. A
 *    leading heading whose text differs from the title is a real section and
 *    stays.
 *
 * Registered in `astro.config.mjs` via
 * `markdown.processor: satteri({ mdastPlugins: [...] })`, alongside the
 * link-rewriting plugin. The processor seeds `data.astro.frontmatter` for the
 * document, which is where the entry title comes from; the pure text and data
 * helpers live here (unit-tested); the plugin only adapts mdast nodes to them.
 */

/** Minimal structural mdast heading surface this plugin reads. */
export type DocsHeadingNode = {
  readonly type: string;
  readonly depth?: number;
};

/** Minimal structural mdast node list this plugin reads. */
export type DocsHeadingRoot = {
  readonly type: string;
  readonly children?: readonly DocsHeadingNode[];
};

/** Minimal structural visitor-context surface used by the demotion visitor. */
export type DocsHeadingContext = {
  setProperty(node: object, key: string, value: unknown): void;
};

/** Minimal structural hook-context surface used by the title-drop hook. */
export type DocsHeadingHookContext = {
  readonly data?: unknown;
  removeNode(node: object): void;
  textContent(node: object): string;
};

export type DocsHeadingsPlugin = {
  readonly name: string;
  before(root: DocsHeadingRoot, ctx: DocsHeadingHookContext): void;
  heading(node: DocsHeadingNode, ctx: DocsHeadingContext): void;
};

/**
 * Demote one Markdown heading level for page rendering. Depths outside
 * 1–6 are never valid mdast; they throw instead of shipping a guess.
 */
export function demoteHeadingDepth(depth: number): number {
  if (!Number.isInteger(depth) || depth < 1 || depth > 6) {
    throw new Error(`bitty-docs-headings: invalid heading depth ${depth}`);
  }
  return Math.min(depth + 1, 6);
}

/**
 * Compare whitespace-insensitively: a source title may wrap across lines or
 * carry trailing spaces while still being the same string.
 */
export function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

/**
 * `true` when a heading repeats the entry title, so it must not be rendered
 * under the page `h1` a second time. Empty text never matches.
 */
export function isDuplicateTitleHeading(
  headingText: string,
  entryTitle: string,
): boolean {
  const heading = normalizeHeadingText(headingText);
  const title = normalizeHeadingText(entryTitle);
  return heading.length > 0 && title.length > 0 && heading === title;
}

/**
 * Read the entry title out of the document data bag the processor seeds
 * (`data.astro.frontmatter.title`). Missing or non-string titles return
 * `null`, which disables the drop instead of guessing one.
 */
export function entryTitleFromData(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const astro = (data as { astro?: unknown }).astro;
  if (typeof astro !== "object" || astro === null) return null;
  const frontmatter = (astro as { frontmatter?: unknown }).frontmatter;
  if (typeof frontmatter !== "object" || frontmatter === null) return null;
  const title = (frontmatter as { title?: unknown }).title;
  if (typeof title !== "string") return null;
  const normalized = normalizeHeadingText(title);
  return normalized.length === 0 ? null : normalized;
}

export function docsHeadingsMdastPlugin(): DocsHeadingsPlugin {
  return {
    name: "bitty-docs-headings",
    before(root, ctx): void {
      const title = entryTitleFromData(ctx.data);
      if (title === null) return;
      const leading = root.children?.find((child) => child.type === "heading");
      if (leading === undefined) return;
      if (!isDuplicateTitleHeading(ctx.textContent(leading), title)) return;
      ctx.removeNode(leading);
    },
    heading(node, ctx): void {
      if (typeof node.depth !== "number") return;
      ctx.setProperty(node, "depth", demoteHeadingDepth(node.depth));
    },
  };
}
