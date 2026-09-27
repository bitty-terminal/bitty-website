/**
 * Published-route regression gate fixtures (#98 §3.3).
 *
 * The gate compares route identities, not counts: a swap of one route for
 * another with an identical count must fail, a loss covered by a redirect to a
 * published target must pass, and the gate must run before any pin advance.
 */

import { describe, expect, test } from "bun:test";

import {
  PublishedRouteLossError,
  aggregatePublishedRoutes,
  assertNoPublishedRouteLoss,
  assertNoPublishedRouteLossBySource,
  routeLossReport,
  withRouteLossGate,
} from "./docsAggregation.ts";
import type { RedirectEntry } from "./redirects.ts";

const redirect = (old: string, target: string): RedirectEntry => ({
  old,
  new: target,
  status: 301,
  reason: "test move",
  effective_version: "0.1.0",
});

describe("assertNoPublishedRouteLoss", () => {
  test("a swap that keeps the count equal still fails", () => {
    const previous = ["/docs/a/", "/docs/b/"];
    const next = ["/docs/a/", "/docs/c/"];
    expect(previous.length).toBe(next.length);
    const report = routeLossReport(previous, next, []);
    expect(report.uncovered).toEqual(["/docs/b/"]);
    expect(report.added).toEqual(["/docs/c/"]);
    let caught: unknown = null;
    try {
      assertNoPublishedRouteLoss(previous, next, []);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PublishedRouteLossError);
    expect((caught as PublishedRouteLossError).uncovered).toEqual(["/docs/b/"]);
  });

  test("a loss covered by a redirect to a published route passes", () => {
    const previous = ["/docs/a/", "/docs/b/"];
    const next = ["/docs/a/", "/docs/c/"];
    expect(() =>
      assertNoPublishedRouteLoss(previous, next, [
        redirect("/docs/b/", "/docs/c/"),
      ]),
    ).not.toThrow();
  });

  test("a redirect to an unpublished target does not cover the loss", () => {
    const previous = ["/docs/b/"];
    const next = ["/docs/a/"];
    expect(() =>
      assertNoPublishedRouteLoss(previous, next, [
        redirect("/docs/b/", "/docs/gone/"),
      ]),
    ).toThrow(PublishedRouteLossError);
  });

  test("a redirect to a route with a published ancestor covers the interim", () => {
    const previous = ["/docs/projects/bitty/specifications/x/"];
    const next = ["/docs/projects/bitty/specifications/"];
    expect(() =>
      assertNoPublishedRouteLoss(previous, next, [
        redirect(
          "/docs/projects/bitty/specifications/x/",
          "/docs/projects/bitty/specifications/deep/y/",
        ),
      ]),
    ).not.toThrow();
  });

  test("an unchanged published set never fails", () => {
    const routes = ["/docs/", "/docs/a/"];
    expect(() => assertNoPublishedRouteLoss(routes, routes, [])).not.toThrow();
  });
});

describe("aggregatePublishedRoutes", () => {
  test("unions every source's routes without duplicates, sorted", () => {
    expect(
      aggregatePublishedRoutes([
        ["/docs/b/", "/docs/"],
        ["/docs/", "/docs/a/"],
      ]),
    ).toEqual(["/docs/", "/docs/a/", "/docs/b/"]);
  });
});

describe("assertNoPublishedRouteLossBySource (cross-source moves, #98 T5)", () => {
  const previousBySource = () =>
    new Map<string, readonly string[]>([
      ["bitty-docs", ["/docs/", "/docs/projects/bitty/architecture/overview/"]],
    ]);

  test("a route re-homed to another source keeps its URL and is not a loss", () => {
    // bitty-docs drops the route, bitty-terminal-docs publishes the same URL:
    // the aggregate still publishes it, so the migration loses nothing.
    const nextBySource = [
      ["/docs/"],
      ["/docs/projects/bitty/architecture/overview/"],
    ];
    expect(() =>
      assertNoPublishedRouteLossBySource(previousBySource(), nextBySource, []),
    ).not.toThrow();
  });

  test("a route no source publishes any more is a loss, attributed to its old source", () => {
    const nextBySource = [["/docs/"]];
    let caught: unknown = null;
    try {
      assertNoPublishedRouteLossBySource(previousBySource(), nextBySource, []);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PublishedRouteLossError);
    expect((caught as PublishedRouteLossError).uncovered).toEqual([
      "bitty-docs: /docs/projects/bitty/architecture/overview/",
    ]);
  });

  test("a lost route covered by a redirect to a published target passes", () => {
    const nextBySource = [["/docs/"]];
    expect(() =>
      assertNoPublishedRouteLossBySource(previousBySource(), nextBySource, [
        redirect("/docs/projects/bitty/architecture/overview/", "/docs/"),
      ]),
    ).not.toThrow();
  });
});

describe("withRouteLossGate (gate runs before the pin advance)", () => {
  const previous = ["/docs/a/", "/docs/b/"];
  const next = ["/docs/a/", "/docs/c/"];

  test("a lost route aborts the advance before commit runs", () => {
    let advanced = false;
    expect(() =>
      withRouteLossGate(previous, next, [], () => {
        advanced = true;
      }),
    ).toThrow(PublishedRouteLossError);
    expect(advanced).toBe(false);
  });

  test("a covered loss lets the advance run", () => {
    let advanced = false;
    withRouteLossGate(
      previous,
      next,
      [redirect("/docs/b/", "/docs/c/")],
      () => {
        advanced = true;
      },
    );
    expect(advanced).toBe(true);
  });
});
