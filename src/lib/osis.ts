/**
 * OSIS book codes -> display names, in canonical order.
 *
 * Scripture is keyed on OSIS refKeys ("Matt.13.1-Matt.13.9") so this archive joins
 * to the RCL spine and to anything else keyed the same way. This map is only for
 * turning a key back into something an elder reads. Deuterocanon is included: the
 * lectionary touches it.
 */

export const OSIS_BOOKS: Record<string, string> = {
  Gen: "Genesis", Exod: "Exodus", Lev: "Leviticus", Num: "Numbers", Deut: "Deuteronomy",
  Josh: "Joshua", Judg: "Judges", Ruth: "Ruth", "1Sam": "1 Samuel", "2Sam": "2 Samuel",
  "1Kgs": "1 Kings", "2Kgs": "2 Kings", "1Chr": "1 Chronicles", "2Chr": "2 Chronicles",
  Ezra: "Ezra", Neh: "Nehemiah", Esth: "Esther", Job: "Job", Ps: "Psalms",
  Prov: "Proverbs", Eccl: "Ecclesiastes", Song: "Song of Solomon", Isa: "Isaiah",
  Jer: "Jeremiah", Lam: "Lamentations", Ezek: "Ezekiel", Dan: "Daniel", Hos: "Hosea",
  Joel: "Joel", Amos: "Amos", Obad: "Obadiah", Jonah: "Jonah", Mic: "Micah",
  Nah: "Nahum", Hab: "Habakkuk", Zeph: "Zephaniah", Hag: "Haggai", Zech: "Zechariah",
  Mal: "Malachi",

  Tob: "Tobit", Jdt: "Judith", Wis: "Wisdom of Solomon", Sir: "Sirach",
  Bar: "Baruch", "1Macc": "1 Maccabees", "2Macc": "2 Maccabees",

  Matt: "Matthew", Mark: "Mark", Luke: "Luke", John: "John", Acts: "Acts",
  Rom: "Romans", "1Cor": "1 Corinthians", "2Cor": "2 Corinthians", Gal: "Galatians",
  Eph: "Ephesians", Phil: "Philippians", Col: "Colossians",
  "1Thess": "1 Thessalonians", "2Thess": "2 Thessalonians",
  "1Tim": "1 Timothy", "2Tim": "2 Timothy", Titus: "Titus", Phlm: "Philemon",
  Heb: "Hebrews", Jas: "James", "1Pet": "1 Peter", "2Pet": "2 Peter",
  "1John": "1 John", "2John": "2 John", "3John": "3 John", Jude: "Jude",
  Rev: "Revelation",
};

const ORDER = Object.keys(OSIS_BOOKS);

/** "Matt.13.1-Matt.13.9" -> "Matt" */
export function bookOf(refKey: string): string {
  return refKey.split("-")[0].split(".")[0];
}

export function bookName(code: string): string {
  return OSIS_BOOKS[code] ?? code;
}

/** URL-safe: "1Cor" -> "1cor" */
export function bookSlug(code: string): string {
  return code.toLowerCase();
}

export function bookFromSlug(slug: string): string | undefined {
  return ORDER.find((code) => code.toLowerCase() === slug.toLowerCase());
}

/** Canonical order, so a scripture index reads Genesis-to-Revelation, not alphabetically. */
export function canonicalIndex(code: string): number {
  const i = ORDER.indexOf(code);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/** Sort chapter-aware within a book: Matt.5 before Matt.13. */
export function chapterOf(refKey: string): number {
  const parts = refKey.split("-")[0].split(".");
  return parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
}
