import { getCollection, type CollectionEntry } from "astro:content";
import { FACET_WEIGHTS } from "./tags";
import { bookOf } from "./osis";

/**
 * The only sanctioned way to read content. Pages must not call getCollection
 * directly: a draft flag that nothing filters on is how five placeholder prayer
 * requests reached the public wall.
 */

export type Order = "elders" | "deacons" | "local-pastors";
export type Conference = "riotexas";

/**
 * `draft` and the date are separate gates, and the distinction matters.
 *
 * `draft: true` means "never publish this" — a letter that was written but superseded,
 * a prayer awaiting a moderator. The date means "publish this on that day": the chair
 * writes several weeks ahead, and a letter dated next Wednesday stays hidden until
 * next Wednesday. That is a schedule, not a draft, and conflating the two is how you
 * end up hand-flipping a boolean every week.
 *
 * Letters only. A future-dated *event* obviously belongs in the calendar before it
 * happens, and a prayer is dated when it is posted.
 *
 * Note this is evaluated at BUILD time, not request time — so a scheduled letter
 * appears only once something rebuilds the site. See .github/workflows/scheduled-rebuild.yml.
 */
function isPublishable(
  collection: "letters" | "prayers" | "events",
  data: { draft?: boolean; expires?: Date; date?: Date },
  now: Date,
): boolean {
  if (data.draft) return false;
  if (data.expires && data.expires.valueOf() < now.valueOf()) return false;
  if (collection === "letters" && data.date && data.date.valueOf() > now.valueOf()) return false;
  return true;
}

export async function published<C extends "letters" | "prayers" | "events">(
  collection: C,
  now: Date = new Date(),
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection);
  return entries.filter((entry) => isPublishable(collection, entry.data, now));
}

export async function publishedLetters(order: Order, conference: Conference) {
  return (await published("letters"))
    .filter((entry) => entry.data.order === order && entry.data.conference === conference)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function publishedPrayers(order: Order, conference: Conference) {
  return (await published("prayers"))
    .filter((entry) => entry.data.order === order && entry.data.conference === conference)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function publishedEvents(order: Order, conference: Conference) {
  return (await published("events"))
    .filter((entry) => entry.data.orders.includes(order) && entry.data.conference === conference)
    .sort((a, b) => a.data.start.valueOf() - b.data.start.valueOf());
}

/* -------------------------------------------------------------------------- */
/* Searching the letters — by tag, by scripture, by likeness                   */
/* -------------------------------------------------------------------------- */

type Letter = CollectionEntry<"letters">;
type FacetKey = "theme" | "image" | "mood" | "ministry";

const FACET_KEYS: FacetKey[] = ["theme", "image", "mood", "ministry"];

export interface TagUse {
  facet: FacetKey;
  tag: string;
  count: number;
}

/** Every tag actually in use, with how many letters carry it. Unused vocabulary is
 *  not shown: a filter that returns nothing is worse than no filter. */
export async function tagsInUse(): Promise<TagUse[]> {
  const letters = await publishedLetters("elders", "riotexas");
  const counts = new Map<string, number>();
  for (const letter of letters) {
    for (const facet of FACET_KEYS) {
      for (const tag of letter.data.tags[facet]) {
        counts.set(`${facet}:${tag}`, (counts.get(`${facet}:${tag}`) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [facet, tag] = key.split(":") as [FacetKey, string];
      return { facet, tag, count };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function lettersByTag(facet: FacetKey, tag: string): Promise<Letter[]> {
  const letters = await publishedLetters("elders", "riotexas");
  return letters.filter((letter) => letter.data.tags[facet].includes(tag as never));
}

export interface ScriptureUse {
  /** OSIS book code, e.g. "Matt" */
  book: string;
  letters: { letter: Letter; refDisplay: string; relation: "epigraph" | "appointed" }[];
}

/**
 * Index every letter by the books it touches — both the epigraph (the verse the
 * letter is actually *about*) and the day's appointed readings. The two are marked
 * differently on purpose: "this letter preaches Matthew 13" and "Matthew 13 was read
 * that Sunday" are different claims, and collapsing them would overstate the archive.
 */
export async function scriptureIndex(): Promise<Map<string, ScriptureUse["letters"]>> {
  const letters = await publishedLetters("elders", "riotexas");
  const index = new Map<string, ScriptureUse["letters"]>();

  const add = (
    refKey: string,
    refDisplay: string,
    letter: Letter,
    relation: "epigraph" | "appointed",
  ) => {
    const book = bookOf(refKey);
    const entries = index.get(book) ?? [];
    // A letter appears once per book per relation — the semicontinuous and
    // complementary RCL tracks both appoint readings, and they overlap.
    if (entries.some((e) => e.letter.id === letter.id && e.relation === relation)) return;
    entries.push({ letter, refDisplay, relation });
    index.set(book, entries);
  };

  for (const letter of letters) {
    if (letter.data.epigraph) {
      add(letter.data.epigraph.refKey, letter.data.epigraph.refDisplay, letter, "epigraph");
    }
    for (const reading of letter.data.readings) {
      add(reading.refKey, reading.refDisplay, letter, "appointed");
    }
  }

  for (const entries of index.values()) {
    // Epigraphs first — those are the letters that actually preach the book.
    entries.sort(
      (a, b) =>
        (a.relation === "epigraph" ? 0 : 1) - (b.relation === "epigraph" ? 0 : 1) ||
        b.letter.data.date.valueOf() - a.letter.data.date.valueOf(),
    );
  }
  return index;
}

export interface Related {
  letter: Letter;
  score: number;
  /** The tags that actually connect the two — shown in the UI so the link can be trusted or overruled. */
  shared: { facet: FacetKey; tag: string }[];
}

/**
 * Related letters by weighted shared-tag overlap. See docs/TAGGING.md: `image`
 * outranks `theme` because two letters sharing "wilderness" tend to be more usefully
 * linked than two sharing "grace", and `mood` is weighted lowest because "wry" is
 * true of most of the corpus and so connects almost nothing.
 */
export async function relatedLetters(letter: Letter, limit = 3): Promise<Related[]> {
  const letters = await publishedLetters("elders", "riotexas");
  const scored: Related[] = [];

  for (const other of letters) {
    if (other.id === letter.id) continue;
    let score = 0;
    const shared: Related["shared"] = [];
    for (const facet of FACET_KEYS) {
      for (const tag of letter.data.tags[facet]) {
        if ((other.data.tags[facet] as readonly string[]).includes(tag)) {
          score += FACET_WEIGHTS[facet];
          shared.push({ facet, tag });
        }
      }
    }
    if (score > 0) scored.push({ letter: other, score, shared });
  }

  return scored
    .sort((a, b) => b.score - a.score || b.letter.data.date.valueOf() - a.letter.data.date.valueOf())
    .slice(0, limit);
}
