/**
 * Warm-paper theme contrast guard (`../styles/global.css`).
 *
 * Parses the single source of truth — the CSS custom properties for the
 * default, dark, and high-contrast palettes — and asserts every text color
 * used on a surface meets WCAG AA (>= 4.5:1 for normal text). Literal
 * (non-variable) pairs such as button text are asserted explicitly.
 * Runs in CI via `bun test src/lib` (part of `bun run check`).
 */

import { describe, expect, test } from "bun:test";

const css = await Bun.file(
  new URL("../styles/global.css", import.meta.url),
).text();

function parseVars(block: string): Map<string, string> {
  const vars = new Map<string, string>();
  const pattern = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g;
  let match = pattern.exec(block);
  while (match !== null) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) {
      vars.set(name, value.toLowerCase());
    }
    match = pattern.exec(block);
  }
  return vars;
}

function splitPalettes(source: string): {
  light: Map<string, string>;
  contrastMore: Map<string, string>;
  dark: Map<string, string>;
} {
  const contrastMarker = "@media (prefers-contrast: more)";
  const darkMarker = "@media (prefers-color-scheme: dark)";
  const contrastAt = source.indexOf(contrastMarker);
  const darkAt = source.indexOf(darkMarker);
  if (contrastAt === -1 || darkAt === -1 || !(contrastAt < darkAt)) {
    throw new Error("theme palette media blocks not found in global.css");
  }
  const light = parseVars(source.slice(0, contrastAt));
  const contrastMore = new Map([
    ...light,
    ...parseVars(source.slice(contrastAt, darkAt)),
  ]);
  const dark = new Map([...light, ...parseVars(source.slice(darkAt))]);
  return { light, contrastMore, dark };
}

function channel(value: number): number {
  const linear = value / 255;
  return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const r = channel(Number.parseInt(hex.slice(1, 3), 16));
  const g = channel(Number.parseInt(hex.slice(3, 5), 16));
  const b = channel(Number.parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const high = Math.max(luminance(fg), luminance(bg));
  const low = Math.min(luminance(fg), luminance(bg));
  return (high + 0.05) / (low + 0.05);
}

const palettes = splitPalettes(css);

type Pair = { fg: string; bg: string; min: number; note: string };

// Variable pairs per palette; every entry verified >= 4.5:1 at authoring
// time and re-asserted here against the live CSS values.
const variablePairs: Record<keyof typeof palettes, Pair[]> = {
  light: [
    { fg: "--muted", bg: "--paper", min: 4.5, note: "secondary text on paper" },
    { fg: "--muted", bg: "--card", min: 4.5, note: "secondary text on cards" },
    {
      fg: "--muted",
      bg: "--paper-deep",
      min: 4.5,
      note: "secondary text on hero gradient",
    },
    { fg: "--accent", bg: "--paper", min: 4.5, note: "eyebrow on paper" },
    { fg: "--accent", bg: "--card", min: 4.5, note: "accent on cards" },
    { fg: "--indigo", bg: "--paper", min: 4.5, note: "links on paper" },
    { fg: "--indigo", bg: "--card", min: 4.5, note: "links on cards" },
    {
      fg: "--indigo-deep",
      bg: "--card",
      min: 4.5,
      note: "link hover on cards",
    },
    { fg: "--ink", bg: "--card", min: 4.5, note: "body text on cards" },
    { fg: "--ok", bg: "--card", min: 4.5, note: "status badges on cards" },
  ],
  dark: [
    { fg: "--muted", bg: "--paper", min: 4.5, note: "secondary text on paper" },
    { fg: "--muted", bg: "--card", min: 4.5, note: "secondary text on cards" },
    { fg: "--accent", bg: "--paper", min: 4.5, note: "eyebrow on paper" },
    { fg: "--indigo", bg: "--paper", min: 4.5, note: "links on paper" },
    { fg: "--indigo", bg: "--card", min: 4.5, note: "links on cards" },
    { fg: "--ink", bg: "--card", min: 4.5, note: "body text on cards" },
    { fg: "--ok", bg: "--card", min: 4.5, note: "status badges on cards" },
  ],
  contrastMore: [
    { fg: "--muted", bg: "--paper", min: 4.5, note: "secondary text" },
    { fg: "--accent", bg: "--paper", min: 4.5, note: "eyebrow" },
    { fg: "--indigo", bg: "--paper", min: 4.5, note: "links" },
  ],
};

// Literal pairs not expressed as variables (button/hanko/skip-link ink,
// status badge tint, dark-mode button ink).
const literalPairs: Pair[] = [
  { fg: "#fffdf8", bg: "#b23a1d", min: 4.5, note: "button text on accent" },
  { fg: "#fffdf8", bg: "#93300f", min: 4.5, note: "button hover text" },
  { fg: "#fffdf8", bg: "#2b2118", min: 4.5, note: "skip-link text on ink" },
  { fg: "#3d7a44", bg: "#eef5ee", min: 4.5, note: "status badge tint" },
  { fg: "#241109", bg: "#ef7a4d", min: 4.5, note: "dark button text" },
  { fg: "#241109", bg: "#f5916a", min: 4.5, note: "dark button hover text" },
  { fg: "#c9b69c", bg: "#16281a", min: 4.5, note: "dark status badge" },
];

describe("warm-paper theme contrast (WCAG AA 4.5:1)", () => {
  for (const [paletteName, pairs] of Object.entries(variablePairs)) {
    const vars = palettes[paletteName as keyof typeof palettes];
    for (const pair of pairs) {
      test(`${paletteName}: var(${pair.fg}) on var(${pair.bg}) — ${pair.note}`, () => {
        const fg = vars.get(pair.fg.slice(2));
        const bg = vars.get(pair.bg.slice(2));
        expect(fg).toBeDefined();
        expect(bg).toBeDefined();
        const ratio = contrast(fg as string, bg as string);
        expect(ratio).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  for (const pair of literalPairs) {
    test(`literal: ${pair.fg} on ${pair.bg} — ${pair.note}`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
});
