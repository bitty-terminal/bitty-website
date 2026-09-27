/**
 * Page-level status badges for the docs header (website#97 item (c)).
 *
 * Status presentation is metadata, not prose: the header renders the page's
 * own `status`, its `audience`, and — when the metadata states a contract that
 * is not implemented — a `contract not implemented` badge. Nothing here reads
 * corpus prose, and the canonical documents are never rewritten; the corpus
 * paragraph rewrite is a recorded cross-repository follow-up.
 *
 * The implementation badge is derived by
 * {@link contractNotImplemented} in `./publicationPolicy.ts`, so the same
 * constants that describe contracts also describe the badge.
 */

import {
  contractNotImplemented,
  type PublicationMetadata,
} from "./publicationPolicy.ts";

export type PageBadgeId = "status" | "audience" | "implementation";

export type PageBadge = {
  readonly id: PageBadgeId;
  readonly label: string;
  /** Raw metadata value, for styling hooks (`data-*`) and tests. */
  readonly value: string;
};

/** Display labels for the audience vocabulary of the shared docs schema. */
export const AUDIENCE_LABELS: Readonly<Record<string, string>> = {
  contributor: "Contributor",
  maintainer: "Maintainer",
  mixed: "Mixed audience",
  "plugin-author": "Plugin author",
  "security-reviewer": "Security reviewer",
  user: "User",
};

/** `draft` -> `Draft`, `plugin-author` -> `Plugin author` (unknown-safe). */
function titleCase(value: string): string {
  const words = value.split(/[-_\s]+/u).filter((word) => word.length > 0);
  if (words.length === 0) return value;
  return words
    .map((word, index) =>
      index === 0
        ? `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`
        : word.toLowerCase(),
    )
    .join(" ");
}

/**
 * Badges for one page, in render order: status, audience, implementation.
 *
 * @throws never — every metadata value has a label (unknown values fall back
 *   to a title-cased form, so a new schema enum value renders rather than
 *   blanking the header).
 */
export function pageBadges(meta: PublicationMetadata): readonly PageBadge[] {
  const badges: PageBadge[] = [
    {
      id: "status",
      label: titleCase(meta.status ?? ""),
      value: meta.status ?? "",
    },
    {
      id: "audience",
      label: AUDIENCE_LABELS[meta.audience] ?? titleCase(meta.audience),
      value: meta.audience,
    },
  ];
  if (contractNotImplemented(meta)) {
    badges.push({
      id: "implementation",
      label: "Contract not implemented",
      value: meta.document_type,
    });
  }
  return badges;
}
