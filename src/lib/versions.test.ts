/**
 * RS-2/RS-3 contracts for the version-navigation authority (`./versions.ts`).
 *
 * These fixtures deliberately use a two-version shape with different target
 * identity sets. The repository's current versions.json has one entry, which
 * cannot prove either alias activation or a missing-identity fallback.
 */

import { describe, expect, test } from "bun:test";

import {
  appendLocationSuffix,
  isHostedVersion,
  resolveAlias,
  rewriteVersionInRoute,
  routeIdentityFromVersionedPath,
  versionEntryPresentation,
  versionTargetRoute,
} from "./versions.ts";

describe("RS-2 active version", () => {
  test("marks the hosted version active for latest, stable, and explicit routes", () => {
    for (const currentVersion of ["latest", "stable", "0.1.0"]) {
      expect(isHostedVersion(currentVersion, "0.1.0")).toBe(true);
    }
  });

  test("does not mark a different hosted version active", () => {
    expect(isHostedVersion("latest", "0.0.9")).toBe(false);
  });

  test("keeps alias resolution in the versions authority", () => {
    expect(resolveAlias("latest")).toBe("0.1.0");
    expect(resolveAlias("stable")).toBe("0.1.0");
    expect(resolveAlias("0.1.0")).toBe("0.1.0");
  });
});

describe("RS-3 target selection", () => {
  const currentRoute = "/docs/latest/decisions/index/?from=docs";

  test("extracts the version-independent public route identity", () => {
    expect(
      routeIdentityFromVersionedPath("/docs/latest/decisions/index/?q=x#y"),
    ).toBe("/decisions/index/");
    expect(() => routeIdentityFromVersionedPath("/not-docs/latest/")).toThrow();
  });

  test("rewrites only the version when the identity exists", () => {
    expect(
      versionTargetRoute({
        currentRoute,
        toVersion: "0.1.0",
        currentIdentityExists: true,
      }),
    ).toBe("/docs/0.1.0/decisions/index/?from=docs");
  });

  test("preserves query and hash supplied to the rewrite authority", () => {
    expect(
      rewriteVersionInRoute("/docs/latest/decisions/index/?q=x#rs-3", "0.1.0"),
    ).toBe("/docs/0.1.0/decisions/index/?q=x#rs-3");
  });

  test("falls back to the target index when the identity is absent", () => {
    const targetIdentities = new Map([
      ["0.0.9", new Set(["/decisions/index/"])],
      ["0.1.0", new Set(["/"])],
    ]);
    const href = versionTargetRoute({
      currentRoute,
      toVersion: "0.1.0",
      currentIdentityExists:
        targetIdentities
          .get("0.1.0")
          ?.has(routeIdentityFromVersionedPath(currentRoute)) ?? false,
    });
    expect(href).toBe("/docs/0.1.0/");
  });

  test("fails closed for a malformed current route", () => {
    expect(() => rewriteVersionInRoute("/not-docs/0.1.0/", "0.1.0")).toThrow();
    expect(
      versionTargetRoute({
        currentRoute: "/not-docs/0.1.0/",
        toVersion: "0.1.0",
        currentIdentityExists: true,
      }),
    ).toBe("/docs/0.1.0/");
  });

  test("projects the exact href and active marker used by the selector", () => {
    const targetIdentities = new Map([
      ["0.0.9", new Set(["/decisions/index/"])],
      ["0.1.0", new Set(["/"])],
    ]);
    const present = versionEntryPresentation({
      currentRoute: "/docs/0.0.9/decisions/index/",
      currentVersion: "stable",
      candidateVersion: "0.1.0",
      candidateLabel: "latest",
      candidateIsPrerelease: true,
      targetIdentities,
    });
    expect(present).toEqual({
      label: "latest",
      suffix: " (prerelease)",
      href: "/docs/0.1.0/",
      isCurrent: true,
    });
  });
});

describe("RS-3 query and hash enrichment", () => {
  const currentRoute = "/docs/latest/decisions/index/?from=docs";

  test("preserves both components from the live location", () => {
    expect(
      appendLocationSuffix(
        "/docs/0.1.0/decisions/index/",
        "?q=open+questions&view=compact",
        "#rs-3",
      ),
    ).toBe("/docs/0.1.0/decisions/index/?q=open+questions&view=compact#rs-3");
  });

  test("adds search and hash to a fallback index too", () => {
    expect(
      appendLocationSuffix(
        versionTargetRoute({
          currentRoute,
          toVersion: "0.1.0",
          currentIdentityExists: false,
        }),
        "?q=open+questions&view=compact",
        "#rs-3",
      ),
    ).toBe("/docs/0.1.0/?q=open+questions&view=compact#rs-3");
  });

  test("preserves a query-only or hash-only location", () => {
    expect(appendLocationSuffix("/docs/0.1.0/", "?q=one", "")).toBe(
      "/docs/0.1.0/?q=one",
    );
    expect(appendLocationSuffix("/docs/0.1.0/", "", "#section")).toBe(
      "/docs/0.1.0/#section",
    );
  });

  test("is additive and idempotent", () => {
    expect(appendLocationSuffix("/docs/0.1.0/", "", "")).toBe("/docs/0.1.0/");
    expect(
      appendLocationSuffix(
        "/docs/0.1.0/?existing=1#existing",
        "?new=1",
        "#new",
      ),
    ).toBe("/docs/0.1.0/?existing=1#existing");
  });
});
