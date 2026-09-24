/**
 * Search box behavior (CTX-0040).
 *
 * Lazy-loaded by `SiteSearch.astro` on first interaction, so pages stay
 * script-free until the visitor actually searches. Fetches the build-time
 * static index (`/search-index.json`) once, ranks with `siteSearch.ts`, and
 * renders version-aware result links for the page's own version segment.
 *
 * Accessibility contract: the input is a labelled combobox, results are a
 * listbox with arrow-key navigation (`aria-activedescendant`), the match
 * count is announced through a polite live region, and Escape clears and
 * closes. Result nodes are built with `textContent` only — index content is
 * treated as untrusted text, never HTML.
 */

import { recordHref, searchRecords, type SearchRecord } from "./siteSearch.ts";

const INDEX_URL = "/search-index.json";

let cachedIndex: Promise<readonly SearchRecord[]> | null = null;

function isSearchRecord(value: unknown): value is SearchRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record["slug"] === "string" &&
    typeof record["title"] === "string" &&
    typeof record["description"] === "string" &&
    typeof record["category"] === "string" &&
    typeof record["text"] === "string"
  );
}

function loadIndex(): Promise<readonly SearchRecord[]> {
  if (cachedIndex === null) {
    cachedIndex = fetch(INDEX_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Search index request failed: ${response.status}`);
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || !payload.every(isSearchRecord)) {
        throw new Error("Search index has an unexpected shape");
      }
      return payload;
    });
    // A failed load must not poison later attempts (e.g. offline first try).
    cachedIndex.catch(() => {
      cachedIndex = null;
    });
  }
  return cachedIndex;
}

/**
 * Wire one rendered search form. Safe to call once per form; reads the
 * current input value immediately so the keystroke that triggered the lazy
 * load is not lost.
 */
export function initSiteSearch(root: HTMLElement): void {
  const maybeInput = root.querySelector("[data-search-input]");
  const maybeList = root.querySelector("[data-search-results]");
  const maybeStatus = root.querySelector("[data-search-status]");
  const version = root.dataset["version"] ?? "latest";
  if (
    !(maybeInput instanceof HTMLInputElement) ||
    !(maybeList instanceof HTMLUListElement) ||
    !(maybeStatus instanceof HTMLElement)
  ) {
    return;
  }
  const input: HTMLInputElement = maybeInput;
  const list: HTMLUListElement = maybeList;
  const status: HTMLElement = maybeStatus;

  let hits: readonly { record: SearchRecord; href: string }[] = [];
  let activeIndex = -1;
  let open = false;

  function setStatus(message: string): void {
    status.textContent = message;
  }

  function close(): void {
    hits = [];
    activeIndex = -1;
    open = false;
    list.replaceChildren();
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function markActive(): void {
    const options = list.querySelectorAll("[role='option']");
    options.forEach((option, index) => {
      option.setAttribute(
        "aria-selected",
        index === activeIndex ? "true" : "false",
      );
    });
    const active = options[activeIndex];
    if (active !== undefined) {
      if (active.id === "") active.id = `site-search-option-${activeIndex}`;
      input.setAttribute("aria-activedescendant", active.id);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function render(records: readonly SearchRecord[], query: string): void {
    list.replaceChildren();
    const versioned = records.map((record) => {
      let href: string;
      try {
        href = recordHref(record, version);
      } catch {
        href = recordHref(record, "latest");
      }
      return { record, href };
    });
    // Version segments that fail closed above still resolve; drop nothing.
    hits = versioned;
    activeIndex = -1;
    for (const [index, hit] of hits.entries()) {
      const item = document.createElement("li");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.id = `site-search-option-${index}`;
      const link = document.createElement("a");
      link.href = hit.href;
      link.tabIndex = -1;
      const title = document.createElement("span");
      title.className = "site-search-title";
      title.textContent = hit.record.title;
      const meta = document.createElement("span");
      meta.className = "site-search-meta";
      meta.textContent =
        hit.record.category.length > 0
          ? `${hit.record.category} · ${hit.record.slug}`
          : hit.record.slug;
      link.append(title, meta);
      item.append(link);
      list.append(item);
    }
    open = hits.length > 0;
    list.hidden = !open;
    input.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) input.removeAttribute("aria-activedescendant");
    setStatus(
      query.length === 0
        ? ""
        : hits.length === 0
          ? `No results for "${query}"`
          : `${hits.length} result${hits.length === 1 ? "" : "s"} for "${query}"`,
    );
  }

  function runSearch(): void {
    const query = input.value;
    if (query.trim().length === 0) {
      close();
      setStatus("");
      return;
    }
    void loadIndex().then(
      (records) => {
        // The visitor may have typed on; always rank the live value.
        if (input.value !== query) {
          runSearch();
          return;
        }
        render(
          searchRecords(records, query).map((hit) => hit.record),
          query,
        );
      },
      () => {
        setStatus("Search is unavailable right now.");
      },
    );
  }

  function goTo(index: number): void {
    const hit = hits[index];
    if (hit !== undefined) window.location.assign(hit.href);
  }

  input.addEventListener("input", () => {
    runSearch();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!open) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      activeIndex =
        (activeIndex + step + hits.length) % Math.max(hits.length, 1);
      markActive();
    } else if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        goTo(activeIndex === -1 ? 0 : activeIndex);
      }
    } else if (event.key === "Escape") {
      if (open || input.value.length > 0) {
        event.preventDefault();
        input.value = "";
        close();
        setStatus("");
      }
    }
  });

  root.addEventListener("focusout", (event) => {
    if (
      event.relatedTarget instanceof Node &&
      root.contains(event.relatedTarget)
    ) {
      return;
    }
    if (open) close();
  });

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    if (open) goTo(activeIndex === -1 ? 0 : activeIndex);
    else runSearch();
  });

  // Rank the keystroke that triggered the lazy load, if any.
  runSearch();
}
