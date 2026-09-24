/**
 * Visual-system contrast guard (`../styles/global.css`).
 *
 * Resolves the single source of truth -- the CSS custom properties for the
 * default, dark, and high-contrast palettes -- to sRGB and asserts every text
 * color used on a surface meets WCAG AA (>= 4.5:1 for normal text). Literal
 * pairs such as primary-button text are asserted explicitly. Runs in CI via
 * `bun test src/lib` (part of `bun run check`).
 */

import { describe, expect, test } from "bun:test";

const css = await Bun.file(
  new URL("../styles/global.css", import.meta.url),
).text();

type Color =
  | { space: "hex"; value: string }
  | { space: "oklch"; l: number; c: number; h: number };

function parseVars(block: string): Map<string, Color> {
  const vars = new Map<string, Color>();
  const pattern =
    /--([\w-]+)\s*:\s*(?:var\(--([\w-]+)\)|(#[0-9a-fA-F]{6})\b|oklch\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\))/g;
  let match = pattern.exec(block);
  while (match !== null) {
    const name = match[1];
    const reference = match[2];
    const hex = match[3];
    const lightness = match[4];
    const chroma = match[5];
    const hue = match[6];
    if (
      name === undefined ||
      (reference === undefined &&
        hex === undefined &&
        (lightness === undefined || chroma === undefined || hue === undefined))
    ) {
      match = pattern.exec(block);
      continue;
    }
    vars.set(
      name,
      reference !== undefined
        ? { space: "hex", value: `var(--${reference})` }
        : hex !== undefined
          ? { space: "hex", value: hex.toLowerCase() }
          : {
              space: "oklch",
              l: Number.parseFloat(lightness as string),
              c: Number.parseFloat(chroma as string),
              h: Number.parseFloat(hue as string),
            },
    );
    match = pattern.exec(block);
  }
  return vars;
}

function resolveVars(
  vars: Map<string, Color>,
  name: string,
  seen = new Set<string>(),
): Color {
  const value = vars.get(name);
  if (value === undefined) {
    throw new Error(`CSS variable --${name} is missing from global.css`);
  }
  if (value.space === "oklch" || seen.has(name)) {
    return value;
  }
  seen.add(name);
  const match = /^var\(--([\w-]+)\)$/.exec(value.value);
  if (match?.[1] === undefined) {
    return value;
  }
  return resolveVars(vars, match[1], seen);
}

function splitPalettes(source: string): {
  light: Map<string, Color>;
  contrastMore: Map<string, Color>;
  dark: Map<string, Color>;
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

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function oklabToRgb(
  lightness: number,
  a: number,
  b: number,
): [number, number, number] {
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((value) => {
    const encoded =
      value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(encoded * 255)));
  }) as [number, number, number];
}

function toRgb(color: Color): [number, number, number] {
  if (color.space === "hex") {
    return hexToRgb(color.value);
  }
  const hue = (color.h * Math.PI) / 180;
  return oklabToRgb(color.l, color.c * Math.cos(hue), color.c * Math.sin(hue));
}

function luminance(color: Color): number {
  const [r, g, b] = toRgb(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: Color, bg: Color): number {
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
      note: "secondary text on quiet surfaces",
    },
    {
      fg: "--muted",
      bg: "--hero",
      min: 4.5,
      note: "secondary text on the hero",
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
    { fg: "--ok", bg: "--ok-soft", min: 4.5, note: "status badges" },
  ],
  dark: [
    { fg: "--muted", bg: "--paper", min: 4.5, note: "secondary text on paper" },
    { fg: "--muted", bg: "--card", min: 4.5, note: "secondary text on cards" },
    {
      fg: "--muted",
      bg: "--hero",
      min: 4.5,
      note: "secondary text on the hero",
    },
    { fg: "--accent", bg: "--paper", min: 4.5, note: "eyebrow on paper" },
    { fg: "--indigo", bg: "--paper", min: 4.5, note: "links on paper" },
    { fg: "--indigo", bg: "--card", min: 4.5, note: "links on cards" },
    { fg: "--ink", bg: "--card", min: 4.5, note: "body text on cards" },
    { fg: "--ok", bg: "--ok-soft", min: 4.5, note: "status badges" },
  ],
  contrastMore: [
    { fg: "--muted", bg: "--paper", min: 4.5, note: "secondary text" },
    { fg: "--accent", bg: "--paper", min: 4.5, note: "eyebrow" },
    { fg: "--indigo", bg: "--paper", min: 4.5, note: "links" },
  ],
};

function hex(hexValue: string): Color {
  return { space: "hex", value: hexValue };
}

const actionPairs: Pair[] = [
  { fg: "--card", bg: "--accent", min: 4.5, note: "primary button text" },
  {
    fg: "--card",
    bg: "--accent-hover",
    min: 4.5,
    note: "primary button hover text",
  },
  { fg: "--card", bg: "--ink", min: 4.5, note: "skip-link text" },
  {
    fg: "--terminal-prompt",
    bg: "--terminal-bg",
    min: 4.5,
    note: "terminal prompt",
  },
  {
    fg: "--terminal-ink",
    bg: "--terminal-bg",
    min: 4.5,
    note: "terminal text",
  },
  {
    fg: "--terminal-muted",
    bg: "--terminal-bg",
    min: 4.5,
    note: "terminal metadata",
  },
];

describe("visual-system contrast (WCAG AA 4.5:1)", () => {
  for (const [paletteName, pairs] of Object.entries(variablePairs)) {
    const vars = palettes[paletteName as keyof typeof palettes];
    for (const pair of pairs) {
      test(`${paletteName}: var(${pair.fg}) on var(${pair.bg}) - ${pair.note}`, () => {
        const ratio = contrast(
          resolveVars(vars, pair.fg.slice(2)),
          resolveVars(vars, pair.bg.slice(2)),
        );
        expect(ratio).toBeGreaterThanOrEqual(pair.min);
      });
    }

    for (const pair of actionPairs) {
      test(`${paletteName}: var(${pair.fg}) on var(${pair.bg}) - ${pair.note}`, () => {
        const ratio = contrast(
          resolveVars(vars, pair.fg.slice(2)),
          resolveVars(vars, pair.bg.slice(2)),
        );
        expect(ratio).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  test("sRGB literal fallback stays valid if one is needed", () => {
    expect(contrast(hex("#ffffff"), hex("#000000"))).toBe(21);
  });
});
