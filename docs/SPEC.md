# orderofelders.org — Structure & Design Handoff

Two sites, one design system, one repo. Version 1 is entirely public and entirely static. Version 2 adds a simple gate around the directory only — nothing else changes.

## 1. Design system

The design is grounded in the elder's ordination: red is the color of the stole, and the fourfold ministry of ¶340 is the structural grammar of both pages.

**Tokens**

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4F2EB` | page background (bone, slightly gray — not warm cream) |
| `--ink` | `#23201B` | text, footer background |
| `--red` | `#8A1F2D` | stole red — structural: bands, rules, cross gridlines, CTAs |
| `--red-deep` | `#5E1520` | hover states, quotation ink |
| `--gold` | `#A5823B` | thread accents: fringe, "answered" prayers, the directory lock |
| `--smoke` | `#6E675C` | muted text, metadata |
| `--hair` | `#D8D3C6` | hairline borders |

**Type**
- Display: **EB Garamond** (500/600, italics for Discipline quotations)
- Body: **Source Serif 4**
- Utility: **Archivo** 600, uppercase, `letter-spacing: .12–.18em` for eyebrows, dates, nav

**Signature elements**
1. *The stole* — two vertical red bands with gold fringe flanking the landing hero (a stole draped over shoulders); on the subdomain masthead it becomes a thin double red rule (the stole seen edge-on). Any future conference subdomain inherits the double rule.
2. *The fourfold cross grid* — the Word/Sacrament/Order/Service section is a 2×2 grid whose red internal gridlines literally form a cross. The structure encodes the content.

Quality floor already in the mockups: responsive to mobile, `prefers-reduced-motion` respected, visible focus states.

## 2. Architecture

```
order-of-elders/                  pnpm workspace monorepo
├── packages/ui/                  shared tokens.css, fonts, base components
├── apps/root/                    Astro 5 → orderofelders.org
│   └── src/pages/index.astro     (mostly the landing, plus /about)
└── apps/riotexas/                Astro 5 → riotexas.orderofelders.org
    ├── src/content/              content collections (below)
    ├── src/pages/
    │   ├── index.astro
    │   ├── letters/[slug].astro
    │   ├── prayers/index.astro
    │   ├── calendar/index.astro
    │   ├── calendar.ics.ts       generated feed (endpoint)
    │   └── map/index.astro
    └── public/data/appointments.geojson
```

Two Vercel (or Netlify) projects from the same repo, each pointed at its app directory. When a second conference joins, `apps/riotexas` is the template: copy, swap a `conference.config.ts` (name, chair, colors stay the same), deploy to a new subdomain.

**DNS** (you own the domain): `A`/`ALIAS` apex → root project; `CNAME riotexas` → subdomain project. Add `www` → apex redirect.

## 3. Content collections (`apps/riotexas`)

```ts
// src/content.config.ts (Astro 5, glob loaders)
letters:  { title, date, author, excerpt, draft }        // markdown body
prayers:  { date, request, attribution?, kind: "petition" | "thanksgiving",
            status: "active" | "answered" | "archived", expires? }
events:   { title, start, end?, location?, kind: "retreat" | "conference"
            | "gathering" | "ordination" | "deadline", url?, description? }
```

**Letters.** The chair's back-catalog of emails is the anchor corpus. Workflow: chair forwards the emails → you lightly edit (salutations trimmed, anything pastoral-confidential removed), one markdown file per letter, dated. Get the chair's explicit sign-off on each before publishing — these were written to a closed list. Title them editorially ("After Corpus Christi") rather than by subject line.

**Prayers.** Each prayer is one markdown/YAML file. `expires` lets stale petitions roll off the wall automatically at build; `answered` prayers get the gold treatment and stay visible longer.

**Events.** Rendered as the list on the page *and* compiled into `calendar.ics` at build so elders can subscribe from Google/Apple Calendar — one content source, two outputs.

## 4. Prayer wall submission (public, no backend)

The wall reads from git; submission is the only interactive piece.

1. **Form**: a plain HTML form on `/prayers` → Netlify Forms or Formspree (both work on a static site; honeypot field for spam).
2. **Moderation**: submissions arrive by email to you + the chair. Nothing publishes automatically.
3. **Publish**: approved requests become content files. Two options:
   - You commit them (fine at low volume), or
   - Wire up **Decap CMS** (git-backed, free) at `/admin` so the chair can approve → publish without touching git. Recommended once volume is real.

**Posted policy** (already drafted into the mockup footer/note): requests are reviewed before posting; first names or initials for third parties; no medical or personal details without consent. As pastors you'll get requests that name congregants — the moderation step is where ¶340.2.a(5) ("maintain all confidences inviolate") gets enforced on the web.

## 5. Map

Reuse the Río Texas Atlas work: you already have geocoded churches. V1 shows **churches where elders serve** — appointment data is public information (it's in the Journal), so no gate needed. One `appointments.geojson` in `public/data/`, Mapbox GL JS with the token supplied at build (`PUBLIC_MAPBOX_TOKEN` env var — it's a public token, scoped to the domains). Marker fill: `--red` at 60%; popup shows church + city, *not* the elder's contact info. Personal pins (home addresses, phones) never go on the public map, even in v2.

## 6. Version 2 — the simple gate

Only `/directory` (and any future `/contact`) is gated. The public site never asks anyone to log in. Three rungs, in order of effort:

**Rung 1 — shared passphrase (recommended start).** Vercel/Netlify edge middleware checks a cookie; no cookie → a gate page ("This page is for members of the Order of Elders of the Río Texas Conference") with one passphrase field. Passphrase announced at clergy session and in the chair's letters, rotated annually after conference. Zero accounts, zero onboarding friction — which is exactly what clergy adoption needs. The gate page uses the same design language: stole rule, EB Garamond, the gold `⚿` glyph already teased in the mockup.

**Rung 2 — email allowlist OTP.** Cloudflare Access (Zero Trust) in front of `/directory`: elder enters their email, gets a one-time code, allowlist maintained from the conference roster. No passwords, real per-person access. Caveat: the free tier caps at 50 seats, and the Río Texas order is larger — so this rung likely means a paid Zero Trust plan or an equivalent (e.g., a tiny Astro SSR route emailing magic links via Resend).

**Rung 3 — real accounts.** Clerk + Astro SSR (the stack you already run for QUORUM/Book The Church) if the order ever wants attributed prayer submissions, RSVPs, or member-editable profiles. Don't build this until someone asks for it twice.

**Directory content model (v2):**
```ts
elders: { name, appointment, church, district, email?, phone?,
          photo?, ordinationYear?, visible: boolean }
```
Each elder opts in (`visible`) — the gate protects the data, but consent decides what's behind it.

## 7. Build order for Claude Code

1. Scaffold the pnpm workspace + two Astro apps; port `tokens.css` and the shared masthead/footer from the mockups.
2. `apps/root`: translate `landing.html` into `index.astro` (it's a single page; keep it static).
3. `apps/riotexas`: content collections + the five pages; seed with 3 letters, 5 prayers, 4 events.
4. `calendar.ics.ts` endpoint from the events collection.
5. Prayer form → Netlify Forms/Formspree; write the moderation note into the page.
6. Map page with the Atlas geojson + Mapbox token.
7. Deploy both, wire DNS, confirm the apex → subdomain links.
8. (v2, later) middleware gate + `/directory` from the `elders` collection.

## 8. Open questions for the chair

- Sign-off process for editing the email archive into public letters.
- Who moderates prayers when you're both at conference/on leave (name a third).
- Whether the landing page should invite other conferences from day one, or after Río Texas has a month of life on it (mockup assumes day one).
- The disclaimer line ("an independent project of elders, for elders; not an official agency of The United Methodist Church") — confirm the chair is comfortable with that framing, and whether the conference office should get a courtesy heads-up before launch.
