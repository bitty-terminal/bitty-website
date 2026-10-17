import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Bitty Manual Collection (CTX-0064).
 * Loads all user-facing documentation from bitty-manual (both English and Chinese).
 */
const docs = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/manual",
  }),
  schema: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { docs };
