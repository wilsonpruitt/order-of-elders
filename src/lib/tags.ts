/**
 * The frozen tag vocabulary — v1, see docs/TAGGING.md.
 *
 * These lists are the leash. A letter carrying a tag that is not in them fails the
 * content schema and the build stops: the vocabulary grows deliberately, with a
 * definition, or it does not grow. Facets are orthogonal on purpose — a shared
 * image means something different from a shared theme.
 */

export const THEMES = [
  "call-and-vocation",
  "grace",
  "presence-of-god",
  "god-who-suffers-with-us",
  "shame-and-wounds",
  "resurrection",
  "holy-spirit",
  "justice",
  "inclusion-and-belonging",
  "discipleship",
  "humility",
  "rest-and-weariness",
  "conflict-and-reconciliation",
  "collegiality",
  "hope-in-desolation",
  "kingdom-of-god",
  "providence-and-control",
  "scripture-and-interpretation",
  "transformation",
  "empire-and-power",
  "mercy",
  "rejection",
  "evangelism",
  "women-in-ministry",
] as const;

export const IMAGES = [
  "wilderness",
  "water-and-sea",
  "fire-and-flame",
  "storm",
  "soil-and-seed",
  "garden",
  "treasure",
  "table-and-meal",
  "shepherd-and-sheep",
  "daily-work",
  "wounds-and-scars",
  "hands-and-touch",
  "bones-and-dust",
  "mountain-and-cloud",
  "road-and-journey",
  "ladder-and-angels",
  "wrestling",
  "crowd-and-parade",
  "empty-room",
  "home-and-hearth",
] as const;

export const MOODS = [
  "wry",
  "tender",
  "weary",
  "consoling",
  "exhortative",
  "lament",
  "indignant",
  "playful",
  "awestruck",
  "confessional",
] as const;

export const MINISTRY = [
  "weariness-and-burnout",
  "preaching-and-the-pulpit",
  "church-conflict",
  "committees-and-administration",
  "appointment-season",
  "collegiality-and-isolation",
  "seminary-and-formation",
  "pastoral-care",
  "call-and-ordination",
  "women-in-ministry",
  "evangelism-and-outreach",
  "rural-and-small-church",
  "politics-and-the-pulpit",
  "self-doubt",
  "sabbath-and-rest",
] as const;

export type Theme = (typeof THEMES)[number];
export type Image = (typeof IMAGES)[number];
export type Mood = (typeof MOODS)[number];
export type Ministry = (typeof MINISTRY)[number];

export const FACETS = [
  { key: "ministry", label: "What you're carrying", values: MINISTRY },
  { key: "theme", label: "Theme", values: THEMES },
  { key: "image", label: "Image", values: IMAGES },
  { key: "mood", label: "Voice", values: MOODS },
] as const;

/**
 * Facet weights for related-letter scoring. `image` outranks `theme` deliberately:
 * two letters sharing "wilderness" tend to be more usefully linked than two sharing
 * "grace". `mood` is weighted lowest because `wry` is true of most of the corpus and
 * so connects almost nothing — a high-frequency tag swamps the distinctive ones.
 */
export const FACET_WEIGHTS = {
  image: 1.5,
  ministry: 1.2,
  theme: 1.0,
  mood: 0.6,
} as const;

/** "call-and-vocation" -> "Call and vocation" */
export function tagLabel(tag: string): string {
  const words = tag.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
