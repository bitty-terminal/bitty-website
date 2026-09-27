/**
 * Published-route regression gate (#98 §3.3, bitty-website).
 *
 * "Advancing a pin must not remove published pages silently." The published set
 * is compared on route IDENTITIES, never on counts: swapping one published
 * route for another keeps the count and must still fail. A lost route is only
 * accepted when an entry in the committed redirect inventory moves it to a
 * route that is published in the new set (or, for the interim, to a route
 * covered by a published ancestor).
 *
 * The gate is pure: `previous` and `next` are version-less `/docs/.../` route
 * lists (the manifest's `published_routes`), and `redirects` is the merged
 * redirect inventory (`./redirects.ts`). {@link withRouteLossGate} makes the
 * ordering explicit — the gate runs before the callback that advances the pin,
 * so the mirror/manifest are never written on a loss.
 */

import { nearestPublishedAncestor } from "./docsRoutes.ts";
import type { RedirectEntry } from "./redirects.ts";

/** Coverage of a published-route transition. */
export type RouteLossReport = {
  /** Previously published routes that now redirect to a published target. */
  readonly covered: readonly string[];
  /** Previously published routes with no declared, published redirect. */
  readonly uncovered: readonly string[];
  /** Routes published in `next` that were not published before. */
  readonly added: readonly string[];
};

/**
 * Compare two published-route sets on route identity.
 *
 * @param previous - published routes before the change
 * @param next - published routes after the change
 * @param redirects - merged redirect inventory (`./redirects.ts`)
 */
export function routeLossReport(
  previous: readonly string[],
  next: readonly string[],
  redirects: readonly RedirectEntry[],
): RouteLossReport {
  const nextSet = new Set(next);
  const previousSet = new Set(previous);
  const byOld = new Map(redirects.map((entry) => [entry.old, entry]));
  const covered: string[] = [];
  const uncovered: string[] = [];
  for (const route of previous) {
    if (nextSet.has(route)) continue;
    const entry = byOld.get(route);
    const target = entry?.new;
    const coveredByRedirect =
      target !== undefined &&
      (nextSet.has(target) ||
        nearestPublishedAncestor(target, nextSet) !== null);
    if (coveredByRedirect) covered.push(route);
    else uncovered.push(route);
  }
  return {
    covered: covered.sort(),
    uncovered: uncovered.sort(),
    added: next.filter((route) => !previousSet.has(route)),
  };
}

/** Error thrown when a published route disappeared without a redirect. */
export class PublishedRouteLossError extends Error {
  readonly uncovered: readonly string[];

  constructor(uncovered: readonly string[]) {
    super(
      [
        `published route loss: ${uncovered.length} route(s) are no longer published and have no published redirect target:`,
        ...uncovered.map((route) => `  - ${route}`),
        "add a redirect in src/redirects.json (or restore the page) before advancing the pin",
      ].join("\n"),
    );
    this.name = "PublishedRouteLossError";
    this.uncovered = uncovered;
  }
}

/**
 * Fail closed when a previously published route is lost without a redirect to
 * a published target.
 */
export function assertNoPublishedRouteLoss(
  previous: readonly string[],
  next: readonly string[],
  redirects: readonly RedirectEntry[],
): void {
  const report = routeLossReport(previous, next, redirects);
  if (report.uncovered.length > 0) {
    throw new PublishedRouteLossError(report.uncovered);
  }
}

/** Union of every source's version-less published routes, sorted. */
export function aggregatePublishedRoutes(
  routesBySource: Iterable<readonly string[]>,
): readonly string[] {
  const union = new Set<string>();
  for (const routes of routesBySource) {
    for (const route of routes) union.add(route);
  }
  return [...union].sort();
}

/**
 * Cross-source published-route regression gate (#98 task T5).
 *
 * {@link assertNoPublishedRouteLoss} compares one previous set with one next
 * set. Onboarding a corpus moves routes BETWEEN sources while keeping the URL
 * (measured: 17 of the 27 published routes are re-homed from `bitty-docs` to
 * `bitty-terminal-docs` at the same path), so a per-source comparison would
 * report them as lost even though the site still serves them. This wrapper
 * compares against the AGGREGATE published set of `next` and still attributes
 * a real loss to the source that used to publish it: a route is lost only when
 * no source publishes it any more.
 *
 * @param previousBySource - committed per-source published routes
 * @param nextBySource - just-computed per-source published routes (any iterable
 *   of route lists; the union is derived here)
 * @throws {@link PublishedRouteLossError} naming every uncovered route,
 *   prefixed with the source id that used to publish it
 */
export function assertNoPublishedRouteLossBySource(
  previousBySource: ReadonlyMap<string, readonly string[]>,
  nextBySource: Iterable<readonly string[]>,
  redirects: readonly RedirectEntry[],
): void {
  const nextUnion = aggregatePublishedRoutes(nextBySource);
  const nextSet = new Set(nextUnion);
  const uncovered: string[] = [];
  for (const [id, previousRoutes] of previousBySource) {
    const lost = previousRoutes.filter((route) => !nextSet.has(route));
    if (lost.length === 0) continue;
    const report = routeLossReport(lost, nextUnion, redirects);
    for (const route of report.uncovered) uncovered.push(`${id}: ${route}`);
  }
  if (uncovered.length > 0) {
    throw new PublishedRouteLossError(uncovered);
  }
}

/**
 * Encode the ordering the acceptance criterion requires: the route-loss gate
 * runs BEFORE `commit` (the pin advance / mirror + manifest write). When the
 * gate throws, `commit` is never called.
 */
export function withRouteLossGate<T>(
  previous: readonly string[],
  next: readonly string[],
  redirects: readonly RedirectEntry[],
  commit: () => T,
): T {
  assertNoPublishedRouteLoss(previous, next, redirects);
  return commit();
}
