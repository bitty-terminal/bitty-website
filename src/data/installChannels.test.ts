import { describe, expect, test } from "bun:test";

import {
  packageChannels,
  pendingChannels,
  primaryChannels,
  RELEASE_POINTER,
} from "../data/installChannels.ts";

const channels = [...primaryChannels, ...packageChannels, ...pendingChannels];
const LOCALES = ["en", "zh-CN"] as const;

describe("install channels", () => {
  test("ids are unique", () => {
    const ids = channels.map((channel) => channel.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every channel is fully localized", () => {
    for (const channel of channels) {
      for (const locale of LOCALES) {
        expect(channel.name[locale].trim().length).toBeGreaterThan(0);
        expect(channel.summary[locale].trim().length).toBeGreaterThan(0);
      }
      expect(channel.arch.trim().length).toBeGreaterThan(0);
    }
  });

  test("available channels expose copyable commands", () => {
    for (const channel of channels) {
      if (channel.status !== "available") continue;
      expect(channel.commands.length).toBeGreaterThan(0);
      expect(channel.pendingReason).toBeUndefined();
      for (const command of channel.commands) {
        expect(command.code.trim().length).toBeGreaterThan(0);
        // Placeholders would ship a command that cannot be pasted as-is.
        expect(command.code).not.toMatch(/<[a-z-]+>/u);
        if (command.label) {
          for (const locale of LOCALES) {
            expect(command.label[locale].trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test("pending channels never look installable", () => {
    for (const channel of pendingChannels) {
      expect(channel.status).toBe("pending");
      expect(channel.commands).toHaveLength(0);
      expect(channel.pendingReason).toBeDefined();
      for (const locale of LOCALES) {
        expect(channel.pendingReason?.[locale]?.trim().length).toBeGreaterThan(
          0,
        );
      }
    }
  });

  test("pending channels are the only ones without commands", () => {
    const withoutCommands = channels
      .filter((channel) => channel.commands.length === 0)
      .map((channel) => channel.id)
      .sort();
    expect(withoutCommands).toEqual(
      pendingChannels.map((channel) => channel.id).sort(),
    );
  });

  test("no command copies a pipe-to-iex ClickFix pattern", () => {
    for (const channel of channels) {
      for (const command of channel.commands) {
        expect(command.code).not.toMatch(/\|\s*iex\b/iu);
      }
    }
  });

  test("the Windows installer downloads to a file before running", () => {
    const windows = channels.find(
      (channel) => channel.id === "windows-installer",
    );
    expect(windows).toBeDefined();
    const [command] = windows?.commands ?? [];
    expect(command?.code).toContain("-OutFile");
    expect(command?.code).toContain("$env:TEMP");
    expect(command?.code).not.toMatch(/^\s*\(?irm\b[^\n]*\biex\b/imu);
  });

  test("artifact downloads resolve through the release pointer", () => {
    for (const channel of [...packageChannels, ...primaryChannels]) {
      for (const command of channel.commands) {
        if (!command.code.includes("cdn.bitty.run/releases/")) continue;
        expect(command.code).toContain("$TAG");
        expect(command.code).toContain(
          "https://cdn.bitty.run/install/latest.txt",
        );
      }
    }
    expect(RELEASE_POINTER).toBe("https://cdn.bitty.run/install/latest.txt");
  });
});
