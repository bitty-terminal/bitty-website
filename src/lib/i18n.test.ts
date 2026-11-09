import { describe, expect, test } from "bun:test";

import {
  SUPPORTED_LOCALES,
  UI_MESSAGES,
  getUiMessages,
  localizePath,
} from "./i18n.ts";

describe("i18n messages", () => {
  test("all supported locales define non-empty strings for every key", () => {
    const enKeys = Object.keys(UI_MESSAGES.en).sort();
    for (const locale of SUPPORTED_LOCALES) {
      const messages = getUiMessages(locale);
      expect(Object.keys(messages).sort()).toEqual(enKeys);
      for (const value of Object.values(messages)) {
        expect(typeof value).toBe("string");
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("localizePath switches cleanly between en and zh-CN routes", () => {
    expect(localizePath("/", "zh-CN")).toBe("/zh-CN/");
    expect(localizePath("/zh-CN/", "en")).toBe("/");
    expect(localizePath("/docs/", "zh-CN")).toBe("/zh-CN/docs/");
    expect(localizePath("/zh-CN/docs/", "en")).toBe("/docs/");
    expect(localizePath("/docs/getting-started/quickstart/", "zh-CN")).toBe(
      "/zh-CN/docs/getting-started/quickstart/",
    );
    expect(localizePath("/zh-CN/docs/getting-started/quickstart/", "en")).toBe(
      "/docs/getting-started/quickstart/",
    );
  });
});
