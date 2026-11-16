#!/usr/bin/env bun
/**
 * Extract structured metadata for all 13 official Bitty Lua plugins from their
 * `bitty-plugin.toml` manifests and `README.md` files into
 * `src/data/officialPlugins.json`.
 *
 * Usage:
 *   bun scripts/extract-official-plugins.mjs
 *   BITTY_PLUGINS_DIR=/path/to/bitty-plugins/plugins bun scripts/extract-official-plugins.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = join(ROOT, "src", "data", "officialPlugins.json");

const OFFICIAL_SLUGS = [
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
];

function resolvePluginsDir() {
  if (process.env.BITTY_PLUGINS_DIR) {
    const dir = resolve(process.env.BITTY_PLUGINS_DIR);
    if (!existsSync(dir)) {
      throw new Error(`BITTY_PLUGINS_DIR does not exist: ${dir}`);
    }
    return dir;
  }

  const candidates = [
    resolve(ROOT, "..", "bitty-plugins", "plugins"),
    resolve(ROOT, "..", "..", "bitty-plugins", "plugins"),
    resolve(ROOT, "..", "..", "..", "bitty-plugins", "plugins"),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "bar", "bitty-plugin.toml"))) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate sibling bitty-plugins/plugins directory. Set BITTY_PLUGINS_DIR to override.",
  );
}

/**
 * Flatten `[capabilities]` from `bitty-plugin.toml` into sorted dotted strings.
 */
function flattenCapabilities(rawCapabilities) {
  const result = new Set();

  function walk(node, prefix) {
    if (node === true) {
      if (prefix) result.add(prefix);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        if (typeof item === "string") {
          result.add(prefix ? `${prefix}.${item}` : item);
        } else if (item && typeof item === "object") {
          if (typeof item.access === "string") {
            const paths =
              Array.isArray(item.paths) && item.paths.length > 0
                ? ` (${item.paths.join(", ")})`
                : "";
            const base = prefix ? `${prefix}.${item.access}` : item.access;
            result.add(`${base}${paths}`);
          } else {
            walk(item, prefix);
          }
        }
      }
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        walk(value, nextPrefix);
      }
    }
  }

  walk(rawCapabilities, "");
  return [...result];
}

/**
 * Extract a top-level `## <Heading>` section from Markdown.
 */
function extractMarkdownSection(markdown, headingName) {
  const escaped = headingName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(
    `^##\\s+${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
    "mu",
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

/**
 * Clean inline Markdown formatting for plain-text metadata display.
 */
function cleanMarkdownInline(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/``(.+?)``/gu, "$1")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/\*([^*]+)\*/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Split a Markdown table row into trimmed cell strings, respecting escaped pipes
 * and backtick code spans.
 */
function splitTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return [];
  const inner = trimmed.replace(/^\|/u, "").replace(/\|$/u, "");
  const cells = [];
  let current = "";
  let codeFenceLen = 0;

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === "\\" && inner[i + 1] === "|") {
      current += "|";
      i += 1;
      continue;
    }
    if (ch === "`") {
      let run = 1;
      while (inner[i + run] === "`") run += 1;
      if (codeFenceLen === 0) {
        codeFenceLen = run;
      } else if (run === codeFenceLen) {
        codeFenceLen = 0;
      }
      current += "`".repeat(run);
      i += run - 1;
      continue;
    }
    if (ch === "|" && codeFenceLen === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse the first Markdown table inside a section into `{ headers, rows }`.
 */
function parseMarkdownTable(sectionText) {
  if (!sectionText) return null;
  const lines = sectionText.split(/\r?\n/u);
  const tableLines = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      inTable = true;
      tableLines.push(trimmed);
    } else if (inTable) {
      break;
    }
  }

  if (tableLines.length < 3) return null;

  const headers = splitTableRow(tableLines[0]).map((h) => h.toLowerCase());
  const rows = [];

  for (let i = 2; i < tableLines.length; i += 1) {
    const cells = splitTableRow(tableLines[i]);
    if (cells.length === 0) continue;
    rows.push(cells);
  }

  return { headers, rows };
}

function extractOverview(markdown, fallbackDescription) {
  const section =
    extractMarkdownSection(markdown, "Overview") ||
    extractMarkdownSection(markdown, "Usage") ||
    extractMarkdownSection(markdown, "Features");

  if (!section) {
    return {
      summary: fallbackDescription,
      highlights: [],
    };
  }

  const paragraphs = [];
  const highlights = [];
  let currentParagraph = [];

  for (const rawLine of section.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (
      line.startsWith("|") ||
      line.startsWith("```") ||
      line.startsWith(">") ||
      line.startsWith("#")
    ) {
      if (currentParagraph.length > 0) {
        paragraphs.push(cleanMarkdownInline(currentParagraph.join(" ")));
        currentParagraph = [];
      }
      if (line.startsWith("|") || line.startsWith("```")) break;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (currentParagraph.length > 0) {
        paragraphs.push(cleanMarkdownInline(currentParagraph.join(" ")));
        currentParagraph = [];
      }
      const item = cleanMarkdownInline(line.slice(2));
      if (item) highlights.push(item);
      continue;
    }

    if (line.length === 0) {
      if (currentParagraph.length > 0) {
        paragraphs.push(cleanMarkdownInline(currentParagraph.join(" ")));
        currentParagraph = [];
      }
      continue;
    }

    currentParagraph.push(line);
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(cleanMarkdownInline(currentParagraph.join(" ")));
  }

  const summary =
    paragraphs.slice(0, 2).join(" ").trim() || fallbackDescription;

  return {
    summary,
    highlights: highlights.slice(0, 6),
  };
}

function extractCommands(toml, markdown) {
  const result = [];
  const seen = new Set();

  if (toml.commands && typeof toml.commands === "object") {
    const entries = Array.isArray(toml.commands)
      ? toml.commands.map((item) => [item.id ?? item.name ?? "", item])
      : Object.entries(toml.commands);

    for (const [key, val] of entries) {
      if (!key || !val || typeof val !== "object") continue;
      const id = String(val.id ?? key).trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        title: String(val.title ?? id.split(":").pop() ?? id).trim(),
        description: String(val.description ?? "").trim(),
      });
    }
  }

  const cmdSection = extractMarkdownSection(markdown, "Commands");
  const table = parseMarkdownTable(cmdSection);
  if (table) {
    const idIdx = table.headers.findIndex((h) => h.includes("command"));
    const descIdx = table.headers.findIndex(
      (h) => h.includes("what it does") || h.includes("description"),
    );

    for (const row of table.rows) {
      const rawId = cleanMarkdownInline(row[idIdx >= 0 ? idIdx : 0] ?? "");
      if (!rawId) continue;
      const desc = cleanMarkdownInline(row[descIdx >= 0 ? descIdx : 1] ?? "");
      const existing = result.find((c) => c.id === rawId);
      if (existing) {
        if (!existing.description && desc) existing.description = desc;
      } else {
        seen.add(rawId);
        result.push({
          id: rawId,
          title: rawId.split(":").pop() ?? rawId,
          description: desc,
        });
      }
    }
  }

  const lazyCommands = Array.isArray(toml.lazy?.commands)
    ? toml.lazy.commands
    : [];
  for (const cmdId of lazyCommands) {
    const id = String(cmdId).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      title: id.split(":").pop() ?? id,
      description: "",
    });
  }

  return result;
}

function extractKeybindings(toml, markdown) {
  const result = [];

  if (toml.keybindings) {
    const items = Array.isArray(toml.keybindings)
      ? toml.keybindings
      : Object.entries(toml.keybindings).map(([chord, val]) =>
          typeof val === "object" && val !== null
            ? { chord, ...val }
            : { chord, command: String(val) },
        );
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const chord = String(item.chord ?? item.key ?? "").trim();
      const command = String(item.command ?? item.action ?? "").trim();
      const context = String(item.context ?? "global").trim();
      if (chord && command) {
        result.push({ chord, command, context });
      }
    }
  }

  if (result.length === 0) {
    const kbSection = extractMarkdownSection(markdown, "Keybindings");
    const table = parseMarkdownTable(kbSection);
    if (table) {
      const chordIdx = table.headers.findIndex(
        (h) => h.includes("chord") || h === "key",
      );
      const cmdIdx = table.headers.findIndex(
        (h) => h.includes("command") || h.includes("action"),
      );
      const ctxIdx = table.headers.findIndex((h) => h.includes("context"));

      for (const row of table.rows) {
        const chord = cleanMarkdownInline(
          row[chordIdx >= 0 ? chordIdx : 0] ?? "",
        );
        const command = cleanMarkdownInline(
          row[cmdIdx >= 0 ? cmdIdx : 1] ?? "",
        );
        const context =
          ctxIdx >= 0
            ? cleanMarkdownInline(row[ctxIdx] ?? "") || "global"
            : "overlay";
        if (chord && command) {
          result.push({ chord, command, context });
        }
      }
    }
  }

  return result;
}

function formatDefaultValue(value) {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function extractSettings(toml, markdown) {
  const readmeDescriptions = new Map();
  const cfgSection = extractMarkdownSection(markdown, "Configuration");
  const table = parseMarkdownTable(cfgSection);

  if (table) {
    const keyIdx = table.headers.findIndex(
      (h) => h === "key" || h === "setting" || h.includes("key"),
    );
    const descIdx = table.headers.findIndex((h) => h.includes("description"));
    if (keyIdx >= 0 && descIdx >= 0) {
      for (const row of table.rows) {
        const key = cleanMarkdownInline(row[keyIdx] ?? "");
        const desc = cleanMarkdownInline(row[descIdx] ?? "");
        if (key && desc) {
          readmeDescriptions.set(key, desc);
        }
      }
    }
  }

  const rawSettings = toml.settings;
  if (!rawSettings || typeof rawSettings !== "object") {
    return [];
  }

  return Object.entries(rawSettings).map(([key, spec]) => {
    const entry = spec && typeof spec === "object" ? spec : {};
    const type = String(entry.type ?? "unknown").trim();
    const defaultVal = formatDefaultValue(entry.default);
    const tomlDesc =
      typeof entry.description === "string" ? entry.description.trim() : "";
    const description = readmeDescriptions.get(key) || tomlDesc || "";
    return {
      key,
      type,
      default: defaultVal,
      description,
    };
  });
}

function extractPlugin(pluginsDir, slug) {
  const pluginDir = join(pluginsDir, slug);
  const tomlPath = join(pluginDir, "bitty-plugin.toml");
  const readmePath = join(pluginDir, "README.md");

  if (!existsSync(tomlPath)) {
    throw new Error(`Missing bitty-plugin.toml for "${slug}" at ${tomlPath}`);
  }

  const toml = Bun.TOML.parse(readFileSync(tomlPath, "utf8"));
  const markdown = existsSync(readmePath)
    ? readFileSync(readmePath, "utf8")
    : "";

  const meta = toml.plugin ?? {};
  const compatRaw = toml.compat ?? {};
  const id = String(meta.id ?? `bitty-terminal.${slug}`).trim();
  const name = String(meta.name ?? slug).trim();
  const version = String(meta.version ?? "0.0.1").trim();
  const description = String(meta.description ?? "").trim();
  const license = String(meta.license ?? "MIT").trim();

  return {
    slug,
    id,
    name,
    version,
    description,
    license,
    repository: `https://github.com/bitty-terminal/${slug}`,
    compat: {
      bitty: String(compatRaw.bitty ?? ">=0.0.24").trim(),
      pluginApi: String(compatRaw["plugin-api"] ?? "^1.0").trim(),
    },
    capabilities: flattenCapabilities(toml.capabilities),
    commands: extractCommands(toml, markdown),
    keybindings: extractKeybindings(toml, markdown),
    settings: extractSettings(toml, markdown),
    overview: extractOverview(markdown, description),
  };
}

const pluginsDir = resolvePluginsDir();
const plugins = OFFICIAL_SLUGS.map((slug) => extractPlugin(pluginsDir, slug));

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(plugins, null, 2)}\n`, "utf8");
console.log(`Extracted ${plugins.length} official plugins to ${OUTPUT_PATH}`);
