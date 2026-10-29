/**
 * Wrap every rendered table in a keyboard-scrollable region.
 *
 * Wide manual tables scroll horizontally. Without `tabindex` the container is
 * unreachable by keyboard (WCAG 2.1 SC 2.1.1, axe `scrollable-region-focusable`),
 * so the wrapper carries `tabindex="0"`, `role="region"`, and an accessible
 * name derived from the header row. Running in the Markdown pipeline keeps the
 * output static: the enhancement works with JavaScript disabled and the
 * accessibility gate can assert it on the built HTML.
 */

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type WrapContext = {
  wrapNode: (node: HastNode, wrapper: HastNode) => void;
};

/** Keep the generated name short; a long header list reads as noise. */
const MAX_HEADER_LABELS = 4;

const FALLBACK_LABEL = "Table";

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join(" ");
}

function rowsOf(node: HastNode, rows: HastNode[] = []): readonly HastNode[] {
  for (const child of node.children ?? []) {
    if (child.tagName === "tr") rows.push(child);
    else rowsOf(child, rows);
  }
  return rows;
}

function headerLabels(table: HastNode): readonly string[] {
  const headerRow = rowsOf(table).find((row) =>
    (row.children ?? []).some((cell) => cell.tagName === "th"),
  );
  if (!headerRow) return [];
  return (headerRow.children ?? [])
    .filter((cell) => cell.tagName === "th")
    .map((cell) => textOf(cell).replace(/\s+/gu, " ").trim())
    .filter((label) => label.length > 0);
}

export function tableLabel(table: HastNode): string {
  const labels = headerLabels(table).slice(0, MAX_HEADER_LABELS);
  if (labels.length === 0) return FALLBACK_LABEL;
  const prefix = labels.some((label) => /\p{Script=Han}/u.test(label))
    ? "表"
    : FALLBACK_LABEL;
  return `${prefix}: ${labels.join(", ")}`;
}

export function tableWrapper(table: HastNode): HastNode {
  return {
    type: "element",
    tagName: "div",
    properties: {
      className: ["table-scroll"],
      tabIndex: 0,
      role: "region",
      "aria-label": tableLabel(table),
    },
    children: [],
  };
}

/** Sätteri HAST plugin definition; `element` visitors filter by tag name. */
export const tableScrollPlugin = {
  name: "bitty-table-scroll",
  element: [
    {
      filter: ["table"],
      visit(node: HastNode, ctx: WrapContext): void {
        ctx.wrapNode(node, tableWrapper(node));
      },
    },
  ],
};
