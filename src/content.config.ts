import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { THEMES, IMAGES, MOODS, MINISTRY } from "./lib/tags";

/** A scripture reference always carries both keys — see docs/TAGGING.md. */
const reference = z.object({
  refKey: z.string(),      // OSIS, for joins: "Matt.13.1-Matt.13.9"
  refDisplay: z.string(),  // for humans: "Matthew 13:1-9"
});

const letters = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/letters" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    excerpt: z.string(),
    draft: z.boolean().default(false),

    // Liturgical facts, joined from the RCL spine. Optional so a letter not tied to
    // a Sunday (a guest letter, an announcement) is still valid.
    occasion: z.string().optional(),
    occasionId: z.string().optional(),
    season: z.string().optional(),
    kind: z.enum(["reflection", "announcement"]).default("reflection"),

    // The verse the letter hangs on, plus the day's appointed readings.
    epigraph: reference.optional(),
    readings: z.array(reference.extend({ role: z.string() })).default([]),

    // Interpretation. Enums, not free strings: an invented tag fails the build.
    tags: z
      .object({
        theme: z.array(z.enum(THEMES)).default([]),
        image: z.array(z.enum(IMAGES)).default([]),
        mood: z.array(z.enum(MOODS)).default([]),
        ministry: z.array(z.enum(MINISTRY)).default([]),
      })
      .default({ theme: [], image: [], mood: [], ministry: [] }),
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
