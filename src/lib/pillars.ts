// Concept pillars for the home page.
//
// Three mental models, in the order a reader needs them: Bitty is a terminal,
// it is a workspace where panels are planned as native concepts, and it is an
// extensible platform. This is the product positioning the site should
// establish, so it is written here once and rendered by the home page as
// qualified product direction.
//
// Website-owned framing copy. Every capability named here is qualified as a
// product direction recorded in the pinned canonical corpus, and the page links
// to that corpus for its status and detail.

export type Pillar = {
  readonly id: string;
  readonly name: string;
  readonly claim: string;
  readonly detail: string;
  readonly href: string;
  readonly linkText: string;
};

export const PILLARS: readonly Pillar[] = [
  {
    id: "terminal",
    name: "Terminal",
    claim: "A terminal designed to stay out of the way",
    detail:
      "The target architecture separates PTY, VT, terminal state, and rendering; the architecture overview marks these as target structure rather than verified compatibility.",
    href: "/docs/latest/projects/bitty/architecture/overview/",
    linkText: "Read the architecture overview",
  },
  {
    id: "workspace",
    name: "Workspace",
    claim: "Panels are planned as native concepts, not shell splits",
    detail:
      "The target workspace treats a panel as a workspace-managed container distinct from its OS window or PTY; a future Panel RFC will decide lifecycle and runtime behavior.",
    href: "/docs/latest/projects/bitty/architecture/core-boundaries/",
    linkText: "Read the core boundaries",
  },
  {
    id: "platform",
    name: "Extensible",
    claim: "Designed to be configured and extended in Lua, behind capabilities",
    detail:
      "The target configuration and extension design uses Lua with XDG roots and declared capabilities, while the host remains responsible for enforcement; the plugin-system document calls this product direction, not shipped behavior.",
    href: "/docs/latest/projects/bitty/extensibility/plugin-system/",
    linkText: "Read the plugin system",
  },
];
