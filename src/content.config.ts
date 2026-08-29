import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Website Delivery RFC OQ-023 — LD-2 Shared schema (strict, mirrors Documentation workflow).
// Every docs/**/*.md frontmatter field is validated before website_publish filtering (LD-3).
// Title-vs-H1, language gate (LD-4), and link integrity (LD-5) are enforced by sync:docs
// validation and build-time checks in src/lib/docsValidation.ts; the collection schema
// here guarantees the eight flat fields, no extra keys, and correct enums.

const docsSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.enum([
      "architecture",
      "configuration",
      "decisions",
      "development",
      "examples",
      "extensibility",
      "findings",
      "how-to",
      "migrations",
      "product",
      "project",
      "provenance",
      "reference",
      "releases",
      "requirements",
      "roadmap",
      "security",
      "specifications",
      "troubleshooting",
      "tutorials",
      "user-guide",
    ]),
    audience: z.enum([
      "contributor",
      "maintainer",
      "mixed",
      "plugin-author",
      "security-reviewer",
      "user",
    ]),
    document_type: z.enum([
      "contract",
      "explanation",
      "guide",
      "index",
      "overview",
      "policy",
      "reference",
      "register",
      "research",
      "specification",
    ]),
    status: z.enum([
      "accepted",
      "archived",
      "deprecated",
      "draft",
      "normative",
      "stable",
    ]),
    website_publish: z.boolean(),
    sidebar_order: z.number().int().nonnegative(),
  })
  .strict();

const docs = defineCollection({
  loader: glob({
    pattern: "docs/**/*.md",
    base: "./src/content/docs",
  }),
  schema: docsSchema,
});

export const collections = { docs };
