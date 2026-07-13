import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const letters = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/letters" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    excerpt: z.string(),
    draft: z.boolean().default(false),
  }),
});

const prayers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/prayers" }),
  schema: z.object({
    date: z.coerce.date(),
    request: z.string(),
    attribution: z.string().optional(),
    kind: z.enum(["petition", "thanksgiving"]),
    status: z.enum(["active", "answered", "archived"]),
    expires: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    location: z.string().optional(),
    kind: z.enum(["retreat", "conference", "gathering", "ordination", "deadline"]),
    url: z.string().url().optional(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { letters, prayers, events };
