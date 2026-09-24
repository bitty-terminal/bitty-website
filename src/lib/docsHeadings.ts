/**
 * Heading-level guard for versioned docs pages (CTX-0035).
 *
 * Every docs page template owns the single `<h1>` (the entry title), so
 * Markdown content headings are demoted one level at build time
 * (`h1`→`h2`, …, `h5`→`h6`, `h6` stays). Canonical text, order, and anchor
 * ids are untouched — only the depth changes, keeping one `h1` per page
 * and a logical heading order no matter how many top-level headings the
 * source document carries.
 *
 * Registered in `astro.config.mjs` via
 * `markdown.processor: satteri({ mdastPlugins: [...] })`, alongside the
 * link-rewriting plugin. The pure depth mapping lives here (unit-tested);
 * the plugin only adapts mdast nodes to it.
 */

/** Minimal structural mdast heading surface this plugin reads. */
export type DocsHeadingNode = {
  readonly type: string;
  readonly depth?: number;
};

/** Minimal structural visitor-context surface this plugin uses. */
export type DocsHeadingContext = {
  setProperty(node: object, key: string, value: unknown): void;
};

export type DocsHeadingsPlugin = {
  readonly name: string;
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

export function docsHeadingsMdastPlugin(): DocsHeadingsPlugin {
  return {
    name: "bitty-docs-headings",
    heading(node, ctx): void {
      if (typeof node.depth !== "number") return;
      ctx.setProperty(node, "depth", demoteHeadingDepth(node.depth));
    },
  };
}
