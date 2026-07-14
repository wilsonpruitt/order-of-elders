#!/usr/bin/env python3
"""
Ingest the chair's missives (Google Drive export) into src/content/letters.

The mechanical layer only: date, liturgical occasion, and the RCL readings.
Title, excerpt and tags are editorial and are supplied out of band via
letters-meta.json — this script refuses to invent them.

Drive docs are named by liturgical day ("7 post pentecost"). This maps each to
its RCL occasion, derives the Sunday from Easter, and dates the letter to the
Wednesday before — the convention the four hand-made letters already follow,
which is asserted as a gate below rather than assumed.

Usage:  python3 scripts/ingest-missives.py --check      (validate only)
        python3 scripts/ingest-missives.py --write      (emit markdown)
"""

import argparse
import json
import os
import re
import sys
from datetime import date, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser("~/Downloads/missives-2026")
RCL = os.path.expanduser("~/reception-corpus/data/rcl.json")
OUT = os.path.join(REPO, "src", "content", "letters")
META = os.path.join(REPO, "scripts", "letters-meta.json")

YEAR = 2026
RCL_YEAR = "A"          # Advent 2025 opened Year A; the Matthew-heavy epigraphs confirm it
EASTER = date(2026, 4, 5)

# Drive doc title -> RCL occasion id (Year A). The chair numbers the Sundays after
# Pentecost sequentially; the RCL keys them to Propers by calendar date. Both are
# recorded so the join is auditable.
OCCASIONS = [
    # (drive doc title,                    rcl occasion id,                      sunday)
    ("Epiphany of the Lord (transferred)", "epiphany-of-the-lord-a",             date(2026, 1, 4)),
    ("Baptism of the Lord",                "baptism-of-the-lord-a",              date(2026, 1, 11)),
    ("2nd Sunday after Epiphany",          "second-sunday-after-the-epiphany-a", date(2026, 1, 18)),
    ("3rd Sunday after Epiphany",          "third-sunday-after-the-epiphany-a",  date(2026, 1, 25)),
    ("4th Sunday after Epiphany",          "fourth-sunday-after-the-epiphany-a", date(2026, 2, 1)),
    ("5th Sunday after Epiphany",          "fifth-sunday-after-the-epiphany-a",  date(2026, 2, 8)),
    ("Transfiguration Sunday",             "transfiguration-sunday-a",           date(2026, 2, 15)),
    ("Lent 1",                             "first-sunday-in-lent-a",             date(2026, 2, 22)),
    ("Lent 2",                             "second-sunday-in-lent-a",            date(2026, 3, 1)),
    ("Lent 3",                             "third-sunday-in-lent-a",             date(2026, 3, 8)),
    ("Lent 4",                             "fourth-sunday-in-lent-a",            date(2026, 3, 15)),
    ("Lent 5",                             "fifth-sunday-in-lent-a",             date(2026, 3, 22)),
    ("Palm / Passion Sunday",              "liturgy-of-the-passion-a",           date(2026, 3, 29)),
    ("Easter Sunday",                      "resurrection-of-the-lord-a",         date(2026, 4, 5)),
    ("Easter 2",                           "second-sunday-of-easter-a",          date(2026, 4, 12)),
    ("Easter 3",                           "third-sunday-of-easter-a",           date(2026, 4, 19)),
    ("Easter 4",                           "fourth-sunday-of-easter-a",          date(2026, 4, 26)),
    ("easter 4 -- replacement",            "fourth-sunday-of-easter-a",          date(2026, 4, 26)),
    ("Easter 5",                           "fifth-sunday-of-easter-a",           date(2026, 5, 3)),
    ("Easter 6",                           "sixth-sunday-of-easter-a",           date(2026, 5, 10)),
    ("Easter 7",                           "seventh-sunday-of-easter-a",         date(2026, 5, 17)),
    ("Pentecost",                          "day-of-pentecost-a",                 date(2026, 5, 24)),
    ("Trinity sunday",                     "trinity-sunday-a",                   date(2026, 5, 31)),
    ("2nd post pentecost",                 "proper-5-10-a",                      date(2026, 6, 7)),
    ("3  post Pentecost",                  "proper-6-11-a",                      date(2026, 6, 14)),
    ("4 post pentecost",                   "proper-7-12-a",                      date(2026, 6, 21)),
    ("5th post pentecost",                 "proper-8-13-a",                      date(2026, 6, 28)),
    ("6th post pentecost",                 "proper-9-14-a",                      date(2026, 7, 5)),
    ("7 post pentecost",                   "proper-10-15-a",                     date(2026, 7, 12)),
    ("8th post pentecost",                 "proper-11-16-a",                     date(2026, 7, 19)),
    ("9th post pentecost",                 "proper-12-17-a",                     date(2026, 7, 26)),
    ("10th post pentecost",                "proper-13-18-a",                     date(2026, 8, 2)),
    ("11th post pentecost",                "proper-14-19-a",                     date(2026, 8, 9)),
    ("12th Post pentecost",                "proper-15-20-a",                     date(2026, 8, 16)),
    ("13th Post Pentecost",                "proper-16-21-a",                     date(2026, 8, 23)),
    ("14th post pentecost",                "proper-17-22-a",                     date(2026, 8, 30)),
    ("15th Post Pentecost",                "proper-18-23-a",                     date(2026, 9, 6)),
]

# The four letters already hand-published, keyed to their Drive doc. Their dates are
# ground truth for the Wednesday-before rule; if a change breaks them, the run aborts.
KNOWN = {
    "4 post pentecost": ("acknowledging-jesus-in-strangers", date(2026, 6, 17)),
    "5th post pentecost": ("the-wounds-that-remain", date(2026, 6, 24)),
    "6th post pentecost": ("the-church-doesnt-need-super-pastors", date(2026, 7, 1)),
    "7 post pentecost": ("who-moves-the-rocks", date(2026, 7, 8)),
}


def wednesday_before(sunday: date) -> date:
    """The chair writes to the order on the Wednesday ahead of the Sunday."""
    return sunday - timedelta(days=4)


def load_rcl() -> dict:
    with open(RCL, encoding="utf-8") as fh:
        data = json.load(fh)
    occasions = data["occasions"] if isinstance(data, dict) else data
    return {o["id"]: o for o in occasions if o.get("year") == RCL_YEAR}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def read_drive_doc(title: str) -> str:
    """Locate the exported Drive doc for a liturgical day.

    Matched on the filename slug, not on the first line: the Easter 4 replacement
    letter (the 1956 clergy-rights anniversary) carries no liturgical-day header.
    """
    want = slugify(title)
    for name in sorted(os.listdir(SRC)):
        if not name.endswith(".md"):
            continue
        stem = re.sub(r"^\d+-", "", name[: -len(".md")])
        if stem == want:
            return os.path.join(SRC, name)
    raise SystemExit(f"no Drive doc found for {title!r} (looked for slug {want!r})")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    rcl = load_rcl()
    problems = []

    # Gate 1: every occasion id resolves in the RCL spine.
    for title, occ_id, _ in OCCASIONS:
        if occ_id not in rcl:
            problems.append(f"occasion id not in rcl.json: {occ_id!r} (for {title!r})")

    # Gate 2: the Wednesday-before rule reproduces the four known letter dates.
    for title, occ_id, sunday in OCCASIONS:
        if title in KNOWN:
            _, known_date = KNOWN[title]
            got = wednesday_before(sunday)
            if got != known_date:
                problems.append(
                    f"date rule broken for {title!r}: computed {got}, published letter says {known_date}"
                )

    # Gate 3: every Sunday really is a Sunday, and Easter is where we think it is.
    for title, _, sunday in OCCASIONS:
        if sunday.weekday() != 6:
            problems.append(f"{title!r}: {sunday} is not a Sunday")
    if EASTER.weekday() != 6:
        problems.append(f"Easter {EASTER} is not a Sunday")

    if problems:
        print("FAILED:", file=sys.stderr)
        for p in problems:
            print("  -", p, file=sys.stderr)
        return 1

    meta = load_meta()
    rows = []
    for title, occ_id, sunday in OCCASIONS:
        occ = rcl[occ_id]
        path = read_drive_doc(title)
        rows.append({
            "drive_doc": title,
            "drive_path": path,
            "occasion": occ["name"],
            "occasionId": occ_id,
            "season": occ["season"],
            "sunday": sunday.isoformat(),
            "date": wednesday_before(sunday).isoformat(),
            "readings": occ["readings"],
            "existing": KNOWN.get(title, (None, None))[0],
        })

    # Gate 4: every letter has editorial metadata. No invented titles.
    missing = [r["drive_doc"] for r in rows if r["drive_doc"] not in meta]
    if missing:
        print("FAILED: no editorial metadata for:", file=sys.stderr)
        for m in missing:
            print("  -", m, file=sys.stderr)
        return 1

    print(f"OK  {len(rows)} letters mapped, {len(rows) - len(KNOWN)} to import, all gates passed")
    manifest = os.path.join(REPO, "scripts", "missives-manifest.json")
    with open(manifest, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, indent=2)
    print(f"    manifest -> {os.path.relpath(manifest, REPO)}")

    if args.write:
        write_letters(rows, meta)
    return 0


# --------------------------------------------------------------------------- #
# Parsing a Drive doc                                                          #
# --------------------------------------------------------------------------- #

# Google's markdown export escapes punctuation: "Hosanna\!" / "10:9 \- 10".
UNESCAPE = re.compile(r"\\([!\-.*_#\[\]()>+`~|])")

# The sign-off. Celia's name is misspelled three different ways across the corpus
# ("Cellia", "Halfafre", double-spaced), so match the shape, not the spelling.
SIGNOFF = re.compile(r"^\s*(?:celia|cellia|lisa)\b.*$", re.IGNORECASE)
VALEDICTION = re.compile(r"^\s*(grace and peace|in faith|blessings)[,.]?\s*$", re.IGNORECASE)
CITATION = re.compile(r"\(NRSV|\(NRSVUE|^\s*\d?\s*[A-Z][a-z]+\.?\s+\d+\s*[:;]")


def clean(text: str) -> str:
    return UNESCAPE.sub(r"\1", text).replace(" ", " ").rstrip()


def load_meta() -> dict:
    with open(META, encoding="utf-8") as fh:
        data = json.load(fh)
    return {k: v for k, v in data.items() if not k.startswith("_")}


def parse_doc(path: str, drive_title: str) -> tuple[str, str, str]:
    """Return (epigraph_text, body, trailing) for a Drive doc.

    The corpus is a set of working documents, not clean sources: two of them carry a
    second draft or a postscript below the sign-off, and one (the guest letter) has
    no liturgical-day header and no epigraph block at all. So the trailing text is
    returned rather than assumed to be junk — the caller decides per letter.
    """
    with open(path, encoding="utf-8") as fh:
        lines = [clean(ln) for ln in fh.read().splitlines()]

    # Drop the liturgical-day header, if present.
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines) and slugify(lines[i]) == slugify(drive_title):
        i += 1

    # The epigraph runs until its citation line. A doc with no citation in its opening
    # (the guest letter) has no epigraph — the whole thing is body.
    head = [n for n in range(i, min(i + 10, len(lines))) if CITATION.search(lines[n])]
    epigraph, start = "", i
    if head:
        cite = head[0]
        epigraph = " ".join(ln.strip() for ln in lines[i:cite] if ln.strip())
        epigraph = epigraph.strip().strip('"').strip("“”").strip()
        start = cite + 1

    # Cut at the sign-off; keep what follows for the caller to judge.
    sign = next((n for n in range(start, len(lines))
                 if SIGNOFF.match(lines[n]) and len(lines[n]) < 60), len(lines))
    body_lines = lines[start:sign]
    while body_lines and (not body_lines[-1].strip() or VALEDICTION.match(body_lines[-1])):
        body_lines.pop()

    trailing = "\n".join(lines[sign + 1:]).strip()
    return epigraph, "\n".join(body_lines).strip(), trailing


def yaml_ref(ref: dict, indent: str) -> str:
    out = [f'{indent}refKey: "{ref["refKey"]}"', f'{indent}refDisplay: "{ref["refDisplay"]}"']
    if "role" in ref:
        out.insert(0, f'{indent}role: "{ref["role"]}"')
    return "\n".join(out)


def write_letters(rows: list, meta: dict) -> None:
    today = date(2026, 7, 14)
    written, skipped, held = [], [], []

    for row in rows:
        m = meta[row["drive_doc"]]
        slug = m["slug"]
        dest = os.path.join(OUT, f"{slug}.md")

        if m.get("existing"):
            # Already hand-published. Backfill the new fields; never touch the prose.
            backfill(dest, row, m)
            skipped.append(slug)
            continue

        epigraph, body, trailing = parse_doc(row["drive_path"], row["drive_doc"])
        if m.get("trailing") == "keep" and trailing:
            body = f"{body}\n\n{trailing}"

        letter_date = date.fromisoformat(row["date"])
        draft = bool(m.get("draft")) or letter_date > today
        if draft:
            held.append((slug, row["date"]))

        ref = m["epigraph"]
        fm = [
            "---",
            f'title: "{m["title"]}"',
            f'date: {row["date"]}',
            f'author: "{m.get("author", "Celia Halfacre")}"',
            f'excerpt: "{m["excerpt"]}"',
            f'draft: {"true" if draft else "false"}',
            f'occasion: "{row["occasion"]}"',
            f'occasionId: "{row["occasionId"]}"',
            f'season: "{row["season"]}"',
            f'kind: "{m.get("kind", "reflection")}"',
            "epigraph:",
            yaml_ref(ref, "  "),
            "readings:",
        ]
        for r in row["readings"]:
            fm.append(f'  - role: "{r["role"]}"')
            fm.append(f'    refKey: "{r["refKey"]}"')
            fm.append(f'    refDisplay: "{r["refDisplay"]}"')
        fm.append("tags:")
        for facet in ("theme", "image", "mood", "ministry"):
            vals = m["tags"].get(facet, [])
            fm.append(f'  {facet}: [{", ".join(vals)}]' if vals else f"  {facet}: []")
        fm.append("---")

        parts = ["\n".join(fm), ""]
        if epigraph:
            parts.append(f'> "{epigraph}"\n>\n> — {ref["refDisplay"]}')
            parts.append("")
        parts.append(body)
        parts.append("")

        with open(dest, "w", encoding="utf-8") as fh:
            fh.write("\n".join(parts))
        written.append(slug)

    print(f"\n    wrote {len(written)} letters, backfilled {len(skipped)} existing")
    if held:
        print(f"    held as drafts ({len(held)} not yet sent):")
        for slug, when in held:
            print(f"      {when}  {slug}")


def backfill(dest: str, row: dict, m: dict) -> None:
    """Add the new fields to an already-published letter, leaving its prose alone."""
    with open(dest, encoding="utf-8") as fh:
        text = fh.read()
    head, sep, body = text.partition("\n---\n")
    if not sep:
        raise SystemExit(f"{dest}: no frontmatter")

    add = [
        f'occasion: "{row["occasion"]}"',
        f'occasionId: "{row["occasionId"]}"',
        f'season: "{row["season"]}"',
        'kind: "reflection"',
        "epigraph:",
        yaml_ref(m["epigraph"], "  "),
        "readings:",
    ]
    for r in row["readings"]:
        add.append(f'  - role: "{r["role"]}"')
        add.append(f'    refKey: "{r["refKey"]}"')
        add.append(f'    refDisplay: "{r["refDisplay"]}"')
    add.append("tags:")
    for facet in ("theme", "image", "mood", "ministry"):
        vals = m["tags"].get(facet, [])
        add.append(f'  {facet}: [{", ".join(vals)}]' if vals else f"  {facet}: []")

    # Strip any previously-backfilled block so re-running is idempotent.
    keep = [ln for ln in head.splitlines()
            if not re.match(r"^(occasion|occasionId|season|kind|epigraph|readings|tags):", ln)
            and not re.match(r"^\s+(role|refKey|refDisplay|theme|image|mood|ministry):", ln)
            and not re.match(r"^\s+- role:", ln)]

    with open(dest, "w", encoding="utf-8") as fh:
        fh.write("\n".join(keep) + "\n" + "\n".join(add) + "\n---\n" + body)


if __name__ == "__main__":
    raise SystemExit(main())
