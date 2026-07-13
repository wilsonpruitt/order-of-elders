# Sister sites — build handoff (deacons + local pastors)

Execution plan for a Sonnet session. Written 2026-07-13 in an Opus planning session.
Decisions below are **settled** — build to them, don't re-litigate. Read `BUILD.md` first for the
existing architecture; this file extends it and overrides it only where it says so explicitly.

Scope: add two sister sites to the existing Astro app and re-point the routing so all three orders
live in one repo, one Vercel project, host-routed.

---

## 0. STOP — fix the live site first (do this before anything else)

Two defects are live on `riotexas.orderofelders.org` right now. They are launch blockers for the
sister sites and embarrassments on the existing one. Fix and deploy them as their own commit,
before touching architecture.

### 0.1 Placeholder content is publicly rendering

`BUILD.md` required that `draft: true` content be filtered out of production builds. **No page ever
implemented the filter.** As a result:

- All 5 prayers in `src/content/prayers/` are `draft: true` placeholders — invented prayer requests
  ("a retired elder in recovery," "eleven ordained") — and they are **live on the public prayer wall**
  under the Río Texas Conference's name.
- `src/content/events/annual-conference-2027.md` is a `draft: true` placeholder and is live on the
  calendar and in the `.ics` feed.

Fix, in this order:

1. Add a shared helper `src/lib/content.ts` that wraps `getCollection` and drops `draft: true`
   entries plus expired prayers (`expires` in the past). Every page and the `.ics` endpoint must go
   through it — no page may call `getCollection` directly again. Enforce the rule in code, not prose.
2. **Delete the five placeholder prayer files outright.** They are invented pastoral requests; there
   is no version of this project where they should exist on disk waiting to be un-drafted by
   accident. The prayer wall ships empty (see §4.3 for the empty state).
3. Keep `annual-conference-2027.md` but ask Wilson for the real 2027 dates, or drop `draft: true`
   only once he confirms them. Do not guess conference dates.
4. `pnpm build`, verify the prayer wall renders its empty state and the `.ics` no longer carries the
   placeholder event, deploy.

### 0.2 The prayer-request button emails a dead address

`orderofelders.org` has **no MX records** — `hello@orderofelders.org` cannot receive mail. Every
"Submit a request" click on the live site goes nowhere. Setup is in §6.2; it's a Wilson task, not a
code task, but the sites cannot launch without it.

---

## 1. The polity, and why it drives the design

This is not decoration. Each site's structure comes straight out of the Discipline, and getting it
wrong is the fastest way to lose the audience.

| | Elders | Deacons | Local pastors |
|---|---|---|---|
| **Body** | Order of Elders (¶306) | Order of Deacons (¶306) | **Fellowship** of Local Pastors and Associate Members (¶323) |
| **Site title** | The Order of Elders | The Order of Deacons | The Fellowship of Local Pastors and Associate Members |
| **Apex** | orderofelders.org | orderofdeacons.org | fellowshipoflocalpastors.org |
| **Fourfold** | Word · Sacrament · Order · Service (¶340.1) | Word · Service · Compassion · Justice (¶329.1) | Word · Sacrament · Order · Service — *"within the context of their appointment"* (¶340.2) |
| **Charter quote** | ¶340 | ¶328–329 | ¶323 |
| **Vestment** | Stole over both shoulders | Stole over the left shoulder, diagonal | **None** — licensed, not ordained |

Three things fall out of that table, and they are the whole design brief:

1. **There are only two Orders.** ¶306 establishes an Order of Deacons and an Order of Elders — that
   is the complete list. Local pastors and associate members belong to a *Fellowship* (¶323), which
   has its own charter, its own elected chair, and explicitly includes **associate members**. Wilson
   owns `orderoflocalpastors.org` and it will redirect, but the site is **titled** as the Fellowship
   and **never** calls itself an order. Associate members are named everywhere local pastors are
   named. Wilson decided this on 2026-07-13; do not "simplify" it back.
2. **The deacons' fourfold is different, and it's a gift.** ¶329.1: *"ordained by a bishop to a
   lifetime ministry of Word, Service, Compassion, and Justice."* The existing cross grid ports over
   with four new words and no structural change.
3. **The local pastors' fourfold is the same as the elders' — but bounded.** ¶340.2: *"Licensed
   pastors share with the elders the responsibilities and duties of a pastor for this fourfold
   ministry, within the context of their appointment."* Same four words, one qualifying clause. That
   clause is the design (§3.3).

### Copy that must appear verbatim

Deacons hero (¶329.1):
> "Deacons are persons called by God, authorized by the Church, and ordained by a bishop to a lifetime ministry of Word, Service, Compassion, and Justice, to both the community and the congregation in a ministry that connects the two."

Fellowship hero (¶323):
> "Each annual conference shall organize a Fellowship of Local Pastors and Associate Members… The Fellowship will provide mutual support for its members for the sake of the life and mission of the church."

Fellowship fourfold intro (¶340.2):
> "Licensed pastors share with the elders the responsibilities and duties of a pastor for this fourfold ministry, within the context of their appointment."

Source of truth for any further quotation: `~/church-documents`, `./bod.py 329` etc. **Quote it, do
not paraphrase it, and do not invent paragraph numbers.** Every ¶ citation you put on a page must be
one you have actually printed from `bod.py`.

---

## 2. Architecture — one repo, one Vercel project, host routing

Settled: this extends the pattern `BUILD.md` already chose. It does not create new repos or new
Vercel projects.

**Do not rename the repo, the directory, or the Vercel project.** `order-of-elders` becomes a
slightly odd name for a three-order repo, and that is an acceptable price. Renaming touches the
GitHub remote, the Vercel link, and the deploy — all for cosmetics. Leave it. (Note it in the README
so the next reader isn't confused.)

### Page tree (restructure)

```
src/pages/
  index.astro                     → disambiguation page (Vercel default domain only; not a public URL)
  elders/
    index.astro                   ← orderofelders.org/            (move of today's src/pages/index.astro)
    riotexas/
      index.astro                 ← riotexas.orderofelders.org/   (move of today's src/pages/riotexas/)
      letters/index.astro
      letters/[slug].astro
      calendar.ics.ts
  deacons/
    index.astro                   ← orderofdeacons.org/
    riotexas/
      index.astro                 ← riotexas.orderofdeacons.org/
      calendar.ics.ts
  local-pastors/
    index.astro                   ← fellowshipoflocalpastors.org/
    riotexas/
      index.astro                 ← riotexas.fellowshipoflocalpastors.org/
      calendar.ics.ts
```

Note the sister riotexas pages have **no letters routes**. See §4.2.

### The one rule that makes host routing work

**Every URL on an order's site is host-relative.** A page on `riotexas.orderofdeacons.org` links to
`/calendar.ics`, never `/deacons/riotexas/calendar.ics` — the rewrite adds the prefix. This already
holds on the elders site; it must hold everywhere, **including static assets**. Therefore:

- Per-order assets live at `public/{order}/…` and are referenced as `/…`.
  `public/deacons/favicon.svg` is fetched as `/favicon.svg` from `orderofdeacons.org`.
- OG images: `public/elders/og-landing.png`, `public/deacons/riotexas/og-riotexas.png`, etc.
- `favicon.svg` must be **removed from the rewrite's exclusion list** so it resolves per-host. Only
  `_astro/` stays excluded (it's the shared build output).
- Today's `public/og-landing.png` and `public/riotexas/og-riotexas.png` move under `public/elders/`.

### vercel.json

Six host rules — **subdomain rules before their apex** (host values are exact strings, so they can't
collide, but keep the ordering anyway for the next reader), all before `handle: filesystem`:

| Host | → dest |
|---|---|
| `riotexas.orderofelders.org` | `/elders/riotexas/$1` |
| `orderofelders.org` | `/elders/$1` |
| `riotexas.orderofdeacons.org` | `/deacons/riotexas/$1` |
| `orderofdeacons.org` | `/deacons/$1` |
| `riotexas.fellowshipoflocalpastors.org` | `/local-pastors/riotexas/$1` |
| `fellowshipoflocalpastors.org` | `/local-pastors/$1` |

Pattern stays as today: `"src": "^/(?!_astro/)(.*)$"`, `"check": true`.

`orderoflocalpastors.org` is **not** in vercel.json — it's a domain-level redirect (§6.1).

⚠️ Regression risk: this changes the live elders routing. After deploying, curl the apex, the
riotexas subdomain, a letter permalink, `/calendar.ics`, `/favicon.svg`, and the OG image on **both**
elders hosts before touching the sister domains.

---

## 3. Design — one system, three signatures

`src/styles/tokens.css` is shared and **unchanged**. Same paper, same ink, same red, same gold, same
fonts. The three sites should look like three vestments cut from one bolt of cloth. Do not invent a
per-order palette — the difference is *form*, not color.

`Base.astro` gains an `order` prop (`"elders" | "deacons" | "local-pastors"`) driving `og:site_name`
and the footer disclaimer wording. Extract the shared masthead, prayer wall, and calendar sections
into `src/components/` so the three riotexas pages are thin — today they're one 196-line page, and
copy-pasting it twice is how the sites drift apart.

### 3.1 Elders — unchanged

Two vertical red bands with gold fringe flanking the hero (the stole worn straight over both
shoulders). Masthead: **double** red rule. Already built; don't touch it beyond the routing move.

### 3.2 Deacons — the diagonal stole

A deacon's stole crosses from the left shoulder to the right hip. So: **one red band, rotated**,
crossing the hero — gold fringe at its lower end. Concretely: a single `.stole` element,
`transform: rotate(20deg)`, anchored top-left of the hero block, `overflow: hidden` on the hero to
crop it. It must read as a stole, not a slash — keep the same 26px band width, the same
`linear-gradient(var(--red-deep), var(--red) 30%)`, the same gold fringe treatment, the same `✚` mark.

Masthead: a **single** red rule (the same stole seen edge-on — one band, not two). This is the
visual grammar: count the rules, know the order.

Fourfold grid: same 2×2 cross, new words — **Word · Service · Compassion · Justice** (¶329.1). Draw
the sub-labels from ¶328's own vocabulary (teaching and proclaiming · the margins · the poor ·
social holiness); don't invent Greek-ish flourishes.

### 3.3 Local pastors — the appointment, not a stole

Local pastors are licensed, not ordained. **There is no stole, and inventing one would be a lie
about their status** — Wilson flagged this explicitly. The signature is instead the thing that *is*
theirs: the appointment, which both authorizes and bounds the ministry (¶340.2).

So: **a bounded frame.** A 2px red rule enclosing the hero text on all four sides — the charge, the
context within which the fourfold is exercised. Where the elders' stole runs off the top of the
viewport (unbounded, itinerant), the local pastor's frame closes. Gold: a small `✚` centered on the
bottom edge of the frame, breaking the rule — the sacrament, present, within the bounds.

Masthead: a single red rule **inset from both page edges** so its ends are visible — a line with
a beginning and an end, where the elders' and deacons' rules run bleed-to-bleed. Subtle, correct,
and it will land for anyone who has ever sat in a clergy session.

Fourfold grid: the **same four words as the elders** (Word · Sacrament · Order · Service), with the
grid itself wrapped in the same red frame, and the ¶340.2 clause as the intro line. Sameness is the
point: they do the same work. The frame is the whole argument, and it's the Discipline's argument,
not ours.

The `/purpose` section quotes ¶323 (the Fellowship's charter: gatherings, continued study, a bond of
unity, relationships of mutual support and trust) — that's what makes the site the Fellowship's and
not a knockoff of the elders'.

---

## 4. Content model

### 4.1 Scope the collections

Today's collections are flat and implicitly Río-Texas-elders. Add two required fields to **all three**
schemas in `src/content.config.ts`:

```ts
order: z.enum(["elders", "deacons", "local-pastors"])   // letters, prayers
orders: z.array(z.enum(["elders", "deacons", "local-pastors"])).min(1)   // events only
conference: z.enum(["riotexas"])                        // all three
```

No defaults — make them required and backfill the existing files (`order: elders`,
`conference: riotexas`). A default is how a deacon's prayer silently shows up on the elders' wall.

**Events take an array**, not a single value. Annual Conference belongs to all three
(`orders: [elders, deacons, local-pastors]`); a Fellowship gathering belongs to one. One event file,
correctly tagged, appears on every calendar and `.ics` that should carry it. This is the payoff of
the single-repo decision — don't lose it by copying event files per order.

Every page filters on `order`/`orders` + `conference` **and** `draft` via the §0.1 helper.

### 4.2 The sister riotexas pages ship thin — on purpose

Wilson has no contact with the deacons' Order chair or the Fellowship chair yet. So those two pages
carry **the prayer wall and the calendar. Nothing else.**

- **No letters section.** No routes, no "coming soon," no empty archive. `BUILD.md`'s rule stands:
  *cut clean rather than tease something unbuilt.* When Wilson has a chair and real letters, letters
  get added — and the elders' `letters/` routes are the template, ready to copy.
- **No invented content of any kind.** Not a placeholder prayer, not a plausible-sounding retreat
  date. See §0.1 for what happens when we do.
- Calendar shows only real, tagged events. If that's just Annual Conference, the calendar shows one
  event — that is honest and fine.

### 4.3 The empty prayer wall

Both sister walls launch with zero prayers, and the elders' wall does too after §0.1. This needs a
designed empty state, not a blank div — an empty prayer wall is the most likely thing a chair sees
on the first visit.

Same card grid; one full-width card in the paper-tone card style, red top border, centered:

> **The wall is open.**
> No prayers have been posted yet. The first will be one of ours.
> [Submit a request →]

Keep the moderation policy note beneath it (verbatim, per `BUILD.md`) — it's how ¶340.2.a(5)
("maintain all confidences inviolate") gets enforced on the web, and it should be visible *before*
anyone submits, not after prayers accumulate.

### 4.4 Cross-links

Each landing gets a small footer row: **The other orders** → the two sibling sites. Same design
system, so it reads as one project. On the deacons' and Fellowship's landing, the "Find your order"
section is titled accordingly ("Find your fellowship" for local pastors) and carries the Río Texas
card plus the same "Your conference" invite card.

Disclaimer wording per site, in the footer (adapt today's elders line):
- Deacons: "An independent project of deacons, for deacons."
- Fellowship: "An independent project of local pastors and associate members, for local pastors and associate members."

Both keep: "Not an official agency of The United Methodist Church."

---

## 5. OG images + favicons

`scripts/generate-og.mjs` currently hardcodes two SVGs. Refactor to a table of six
(3 landings + 3 riotexas), sharing the paper/ink/red/gold constants and the `goldFringe()` helper,
each carrying its order's signature:

- elders: two vertical bands (existing)
- deacons: one rotated band
- local-pastors: the enclosing frame

Write to `public/{order}/og-landing.png` and `public/{order}/riotexas/og-riotexas.png`, 1200×630.

Favicons: `public/{order}/favicon.svg`. Elders = the double band; deacons = the diagonal band;
local pastors = the frame with the gold cross. 16px legibility is the constraint — at that size the
diagonal and the frame are distinguishable but the fringe is not. Don't try to draw fringe.

---

## 6. Deploy + DNS — needs Wilson's explicit OK, per action

**Do not run any of this unprompted.** Surface each command and wait. All of `BUILD.md`'s deploy
rules still apply — Vercel team **wilson-pruitts-projects** (Labs, not Covenant); commit author must
be `littleeachdayapp-droid` / `littleeachdayapp@gmail.com` or the team **blocks the deploy**.

### 6.1 Domains

DNS is Cloudflare, **DNS-only / grey cloud**, `A → 76.76.21.21` (matching how
`riotexas.orderofelders.org` is already set up — it's an A record, not a CNAME).

⚠️ **The thing everyone forgets:** wildcard SSL does not auto-issue on Cloudflare DNS — Vercel can't
perform a DNS-01 challenge on external nameservers. **Every hostname must be added explicitly** to
get its own HTTP-01 cert:

```
npx vercel domains add orderofdeacons.org
npx vercel domains add riotexas.orderofdeacons.org
npx vercel domains add fellowshipoflocalpastors.org
npx vercel domains add riotexas.fellowshipoflocalpastors.org
npx vercel domains add orderoflocalpastors.org        # redirect only
```

Plus `www` → apex redirects for each, and in the Vercel dashboard set **`orderoflocalpastors.org`
(and its `www`) to redirect to `fellowshipoflocalpastors.org`** — a domain-level redirect, not a
vercel.json rule. It still needs its own DNS record and cert; a redirect domain is a real domain.

`orderofdeacons.org` was registered 2026-07-13 and is on Cloudflare NS but has no A record yet.
`fellowshipoflocalpastors.org` was registered the same day — check its NS delegation before adding.

### 6.2 Email routing (Wilson's task — launch blocker)

Cloudflare Email Routing, free, adds MX records. Three addresses, all forwarding to the inbox Wilson
names (he must click the verification email Cloudflare sends to the destination):

- `hello@orderofelders.org` ← **currently broken and live**
- `hello@orderofdeacons.org`
- `hello@fellowshipoflocalpastors.org`

The mailto subject lines are already prefilled per site (`Prayer request — Order of Deacons`, etc.)
so moderation is sortable. Verify each address actually delivers — send a test — **before** any site
is announced. A prayer request that silently vanishes is worse than no prayer wall.

---

## 7. Build order

1. **§0 first.** Draft filter helper + delete placeholder prayers + deploy. Its own commit.
2. Restructure `src/pages/` into `elders/`; update `vercel.json`; move `public/` assets under
   `public/elders/`. **Deploy and verify the live elders site is unbroken** before adding anything new.
3. Extract shared components (`Masthead`, `PrayerWall` + empty state, `Calendar`, `Fourfold`) and add
   the `order` prop to `Base.astro`.
4. Scope the content collections (§4.1); backfill existing files.
5. Deacons: landing + riotexas page + `.ics`. Real ¶ quotes only.
6. Local pastors: landing + riotexas page + `.ics`. Titled as the Fellowship throughout; associate
   members named wherever local pastors are.
7. OG images + favicons for all six/three.
8. `pnpm build` clean, then deploy — Wilson's OK per action for domains and the production deploy.

Everything through step 7 is safe, local, and needs no permission. Steps 6 in §6 and the prod deploy
do not happen without Wilson saying go.

---

## 8. Open questions for Wilson (not for the build)

- Real dates for Río Texas Annual Conference 2027 — the placeholder is currently live.
- Who are the deacons' Order chair and the Fellowship chair, and does either want a courtesy
  heads-up before their conference's page exists at a public URL?
- Prayer moderation for the two new walls: same moderator (Wilson), or does each body name its own?
  Three walls with no named moderator is how a prayer wall becomes a liability.
- Does the Río Texas conference office get a heads-up before three sites go live at once (vs. one)?
- Associate members: does the Fellowship page need anything that speaks to them *specifically*, or is
  naming them alongside local pastors throughout sufficient for v1?
