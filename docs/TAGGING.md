# Tagging the letters — controlled vocabulary v1

Frozen 2026-07-14, derived bottom-up from the 37 letters of the 2026 liturgical
year (Epiphany 2026 → Proper 18). New letters are tagged **against** this list.
New concepts get merged in deliberately, with a definition, and the version bumped
— they are not forked ad hoc. That discipline is the whole point: a vocabulary
that grows by accident becomes 400 near-duplicate tags and stops connecting anything.

## What is tagged, and what is not

Some things about a letter are **facts**, and facts are indexed directly, never tagged:

| Fact | Where it comes from |
|---|---|
| `date` | The Wednesday before the Sunday — the chair writes ahead of the day |
| `occasion`, `occasionId`, `season` | The RCL spine (`~/reception-corpus/data/rcl.json`, Year A) |
| `readings` | Joined from the RCL occasion — first, psalm, second, gospel |
| `epigraph` | The verse the letter actually hangs on, in OSIS `refKey` + human `refDisplay` |

Only **interpretation** is tagged. If you can look it up, don't tag it.

Scripture is keyed per the house data standard: every reference carries **both** a
machine key (`refKey`, OSIS: `Matt.13.1-Matt.13.9`) and a human string
(`refDisplay`, "Matthew 13:1–9"). Machines join on the first; elders read the
second. This is what lets a letter, a lectionary reading, and anything else keyed
the same way find each other.

## Four facets

Tags are **faceted** — orthogonal axes, each its own controlled list — because two
letters can resemble each other in genuinely different ways. A shared `image` means
something different from a shared `theme`, and collapsing them into one flat list
loses exactly the connections worth having.

The vocabulary is **shared across all letters** (not per-letter palettes), because
connection *is* the goal here: an elder searching this archive wants to find every
letter that speaks to what they're carrying this week.

---

### `theme` — what the letter argues
The theological or pastoral claim. Assign 1–3.

- `call-and-vocation` — being summoned by God, and what the summons costs
- `grace` — unearned, prior, and usually inconvenient love
- `presence-of-god` — God turning out to have been here the whole time
- `god-who-suffers-with-us` — a God who enters wounds rather than explaining them
- `shame-and-wounds` — what we hide, what we carry, what refuses to close over
- `resurrection` — new life, and that it does not erase what happened
- `holy-spirit` — the uncontrollable, un-labor-saving Spirit
- `justice` — God's demand against exploitation and hollow religion
- `inclusion-and-belonging` — who is pushed out, and God's work of restoring them
- `discipleship` — the ordinary practice of following: abiding, learning, staying
- `humility` — God working through small, bumbling people
- `rest-and-weariness` — the limits of the body and the gift of stopping
- `conflict-and-reconciliation` — harm named, repentance sought, the body mended
- `collegiality` — that this life was never meant to be lived alone
- `hope-in-desolation` — speaking to dry bones anyway
- `kingdom-of-god` — the reign that arrives unbidden and unowned
- `providence-and-control` — our plans, and God's amused indifference to them
- `scripture-and-interpretation` — how we read, mistranslate, and are surprised by the text
- `transformation` — the lifetime it takes to be changed
- `empire-and-power` — the powers, and the rebellion of mercy against them
- `mercy` — grace extended to the one with no claim on it
- `rejection` — being passed over, unnamed, not chosen
- `evangelism` — sharing the gospel with empty hands
- `women-in-ministry` — the calling, cost, and full inclusion of women in orders

### `image` — the concrete motif it hangs on
The picture, not the point. **This axis carries the surprising connections** — two
letters sharing `wilderness` are often more usefully linked than two sharing
`grace`. Assign 1–3. Prefer the recurring motif over a one-off; a tag used once
connects nothing.

- `wilderness` · `water-and-sea` · `fire-and-flame` · `storm`
- `soil-and-seed` · `garden` · `treasure`
- `table-and-meal` · `shepherd-and-sheep` · `daily-work`
- `wounds-and-scars` · `hands-and-touch` · `bones-and-dust`
- `mountain-and-cloud` · `road-and-journey` · `ladder-and-angels`
- `wrestling` · `crowd-and-parade` · `empty-room` · `home-and-hearth`

### `mood` — the voice she writes in
Affect, not content. Assign 1–2.

- `wry` — the house register: self-deprecating, funny, slightly exasperated
- `tender` · `weary` · `consoling` · `exhortative`
- `lament` · `indignant` · `playful` · `awestruck` · `confessional`

### `ministry` — the clergy-life situation it speaks into
**The axis that makes this archive worth searching.** An elder does not usually come
looking for "letters about grace" — they come carrying a hard week. Assign 1–3.

- `weariness-and-burnout` — the pull to do it all, be it all, and the cost of it
- `preaching-and-the-pulpit` — the sermon, the text, the terror of the pulpit
- `church-conflict` — harm inside the body, and the pain of naming it
- `committees-and-administration` — SPRC, finance, the consent agenda, the calendar
- `appointment-season` — being sent, being passed over, wanting a "better" church
- `collegiality-and-isolation` — needing your people; carrying more than you should alone
- `seminary-and-formation` — the giants of the chapel, and who we became there
- `pastoral-care` — hospital rooms, deathbeds, the long visit
- `call-and-ordination` — candidates, vows, and remembering why
- `women-in-ministry` — misogyny, full clergy rights, sisters in orders
- `evangelism-and-outreach` — the clinic, the neighbor, the community
- `rural-and-small-church` — drought, cattle, two-point charges
- `politics-and-the-pulpit` — preaching into a moment that will punish you for it
- `self-doubt` — imposter syndrome; being a better pastor than you were and worse than you should be
- `sabbath-and-rest` — the nap as a theological act

---

## The method (how v1 was built, and how v2 should be)

1. **Open-tag** a representative slice freely — do not pre-commit to a vocabulary.
2. **Consolidate** into a controlled list: merge synonyms, one canonical term per
   concept, a one-line definition for each. This step is what prevents tag sprawl.
3. **Freeze** and version it.
4. **Tag everything against the frozen list.**

AI drafts the tag assignments from the frozen vocabulary; **a human curates the
vocabulary itself and spot-checks the assignments.** The frozen list is the leash —
the model assigns *from* it and does not invent freely.

## Connecting letters

Related-letter suggestions use weighted shared-tag overlap. Weight the facets by how
much they actually carry the connection:

```
image 1.5   ministry 1.2   theme 1.0   mood 0.6
```

`image` outranks `theme` on purpose. Show the connecting tags in the UI — the "why"
is half the value, and it lets an elder overrule a bad link.

Beware high-frequency tags swamping distinctive ones: `wry` is true of most of the
corpus and therefore connects almost nothing. That is why `mood` is weighted lowest.
