import { describe, expect, test } from "bun:test";

import { tableLabel, tableScrollPlugin, tableWrapper } from "./tableScroll.ts";

type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

function text(value: string): Node {
  return { type: "text", value };
}

function element(tagName: string, children: Node[] = []): Node {
  return { type: "element", tagName, children };
}

function table(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): Node {
  return element("table", [
    element(
      "tr",
      headers.map((label) => element("th", [text(label)])),
    ),
    ...rows.map((cells) =>
      element(
        "tr",
        cells.map((cell) => element("td", [text(cell)])),
      ),
    ),
  ]);
}

describe("tableScrollPlugin", () => {
  test("wraps a table in a focusable, labelled region", () => {
    const current = table(["Command", "Description"], [["bitty", "Terminal"]]);
    let wrapper: Node | undefined;
    const visitor = tableScrollPlugin.element[0];
    visitor?.visit(current, {
      wrapNode(node, parent) {
        expect(node).toBe(current);
        wrapper = parent;
      },
    });

    expect(wrapper?.tagName).toBe("div");
    expect(wrapper?.properties?.["className"]).toEqual(["table-scroll"]);
    expect(wrapper?.properties?.["tabIndex"]).toBe(0);
    expect(wrapper?.properties?.["role"]).toBe("region");
    expect(wrapper?.properties?.["aria-label"]).toBe(
      "Table: Command, Description",
    );
  });

  test("reads headers from a thead wrapper", () => {
    const current = element("table", [
      element("thead", [
        element("tr", [
          element("th", [text("Option")]),
          element("th", [text("Default")]),
        ]),
      ]),
      element("tbody", [element("tr", [element("td", [text("x")])])]),
    ]);
    expect(tableWrapper(current).properties?.["aria-label"]).toBe(
      "Table: Option, Default",
    );
  });

  test("reads header text out of nested markup", () => {
    const current = element("table", [
      element("tr", [
        element("th", [element("code", [text("--dry-run")])]),
        element("th", [text("Effect")]),
      ]),
    ]);
    expect(tableWrapper(current).properties?.["aria-label"]).toBe(
      "Table: --dry-run, Effect",
    );
  });

  test("caps the header list and falls back to a plain name", () => {
    expect(tableLabel(table(["a", "b", "c", "d", "e"], []))).toBe(
      "Table: a, b, c, d",
    );
    expect(tableLabel(table([], []))).toBe("Table");
  });
});
