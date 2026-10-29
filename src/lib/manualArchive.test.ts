import { describe, expect, test } from "bun:test";

import {
  assertRegularArchiveMember,
  assertSafeArchivePath,
} from "./manualArchive.ts";

describe("assertSafeArchivePath", () => {
  test("accepts locale documents, locale roots, and the manifest", () => {
    expect(() =>
      assertSafeArchivePath("en/getting-started/quickstart.md", "en"),
    ).not.toThrow();
    expect(() => assertSafeArchivePath("en/extensions/", "en")).not.toThrow();
    expect(() => assertSafeArchivePath("manifest.json", "en")).not.toThrow();
  });

  test("rejects traversal, absolute paths, and other locales", () => {
    for (const path of [
      "en/../../evil.md",
      "en/./quickstart.md",
      "en//quickstart.md",
      "/etc/pwn.md",
      "zh-CN/getting-started/quickstart.md",
      "other/en/x.md",
    ]) {
      expect(() => assertSafeArchivePath(path, "en")).toThrow();
    }
  });

  test("rejects Windows path separators that escape the locale", () => {
    expect(() => assertSafeArchivePath("en\\..\\..\\evil.md", "en")).toThrow();
  });
});

describe("assertRegularArchiveMember", () => {
  test("accepts regular files and directories", () => {
    expect(() =>
      assertRegularArchiveMember("-", "en/quickstart.md", "en"),
    ).not.toThrow();
    expect(() => assertRegularArchiveMember("d", "en/", "en")).not.toThrow();
  });

  test("rejects links and special members", () => {
    for (const type of ["l", "h", "p", "s", "b", "c", ""]) {
      expect(() =>
        assertRegularArchiveMember(type, "en/quickstart.md", "en"),
      ).toThrow(/unsupported/u);
    }
  });
});
