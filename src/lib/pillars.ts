// Concept pillars for the home page.
//
// Three mental models, in the order a reader needs them: Bitty is a terminal,
// it is a workspace where panels are native, and it is an extensible platform.
// This is the product positioning the site should establish, so it is written
// here once and rendered by the home page.
//
// Website-owned framing copy. It makes no claim beyond the published docs:
// every capability named here is a product direction recorded in the pinned
// canonical corpus, and the page links to that corpus for detail.

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
    claim: "A terminal that stays out of the way",
    detail:
      "PTY and VT compatibility, scrollback, IME, and GPU-rendered cells, so the tools you already use run unmodified.",
    href: "/docs/latest/projects/bitty/architecture/overview/",
    linkText: "Read the architecture overview",
  },
  {
    id: "workspace",
    name: "Workspace",
    claim: "Panels are a native concept, not a shell split",
    detail:
      "A panel is something you can focus, move, resize, and restore, independent of the process running inside it.",
    href: "/docs/latest/projects/bitty/architecture/core-boundaries/",
    linkText: "Read the core boundaries",
  },
  {
    id: "platform",
    name: "Extensible",
    claim: "Configured and extended in Lua, behind capabilities",
    detail:
      "Lua configuration layered over XDG roots, and plugins that receive declared capabilities rather than ambient access.",
    href: "/docs/latest/projects/bitty/extensibility/plugin-system/",
    linkText: "Read the plugin system",
  },
];
