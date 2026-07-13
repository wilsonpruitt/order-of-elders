import { getCollection, type CollectionEntry } from "astro:content";

/**
 * The only sanctioned way to read content. Pages must not call getCollection
 * directly: a draft flag that nothing filters on is how five placeholder prayer
 * requests reached the public wall.
 */

function isPublishable(data: { draft?: boolean; expires?: Date }, now: Date): boolean {
  if (data.draft) return false;
  if (data.expires && data.expires.valueOf() < now.valueOf()) return false;
  return true;
}

export async function published<C extends "letters" | "prayers" | "events">(
  collection: C,
  now: Date = new Date(),
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection);
  return entries.filter((entry) => isPublishable(entry.data, now));
}

export async function publishedLetters() {
  return (await published("letters")).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function publishedPrayers() {
  return (await published("prayers")).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function publishedEvents() {
  return (await published("events")).sort((a, b) => a.data.start.valueOf() - b.data.start.valueOf());
}
