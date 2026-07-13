# order-of-elders — build handoff

Execution plan. The architecture decisions below are settled — build to them, don't re-litigate.
Source mockups + original spec are in `docs/` (ported verbatim from `~/Downloads/files-2`).

## Deviation from SPEC.md — read this first

SPEC.md calls for a **pnpm monorepo, two Astro apps, two Vercel projects**. We are NOT doing that.

**We build one Astro 5 static app, one Vercel project, with host-based routing.**

Why: Field Guide (`~/field-guide`) already solved apex-landing + per-conference-subdomain and landed
on one repo / one project / host routing (`src/proxy.ts`). Two Vercel projects doubles the deploy
surface for what is currently two pages of content sharing one design system. Adding conference #2
should be a new content folder, not a new Vercel project.

Routing:
- `orderofelders.org/` → `src/pages/index.astro` (the landing)
- `riotexas.orderofelders.org/*` → rewritten to `/riotexas/*` by a host rewrite in `vercel.json`

This keeps the build fully **static** (`output: 'static'`) — no SSR adapter, no middleware, no DB.
v1 has no auth and no backend, so Astro content collections are the whole data layer. Precedent:
`~/ac-guide` (Astro 5, static, content collections, `vercel.json` pins framework=astro + outputDir=dist).

## Stack

- Astro 5, static output. No adapter. No Tailwind — the mockup CSS is hand-written and good; port it.
- Content collections (glob loaders) for `letters`, `prayers`, `events`.
- Fonts: EB Garamond, Source Serif 4, Archivo via Google Fonts (as in the mockups).
- pnpm. Node 24. Build is plain `astro build` — no Prisma, no env vars required for v1.

## Design system — port, don't redesign

`src/styles/tokens.css` holds the tokens exactly as specified. Do not invent new colors.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F4F2EB` | page background |
| `--ink` | `#23201B` | text, footer background |
| `--red` | `#8A1F2D` | stole red — bands, rules, cross gridlines, CTAs |
| `--red-deep` | `#5E1520` | hover, quotation ink |
| `--gold` | `#A5823B` | fringe, "answered" prayers, directory lock |
| `--smoke` | `#6E675C` | muted text, metadata |
| `--hair` | `#D8D3C6` | hairline borders |

Two signature elements must survive the port intact:
1. **The stole** — two vertical red bands with gold fringe flanking the landing hero. On the riotexas
   masthead it becomes a thin double red rule (the stole seen edge-on). Any future conference
   subdomain inherits the double rule.
2. **The fourfold cross grid** — the Word/Sacrament/Order/Service block is a 2×2 grid whose red
   internal gridlines form a cross. The structure encodes the content. Keep the 2px gap + red
   background trick that produces it.

Quality floor already met in the mockups — keep it: responsive to mobile, `prefers-reduced-motion`
respected, visible `:focus-visible` states.

## Content collections (`src/content.config.ts`)

```ts
letters: { title, date, author, excerpt, draft }        // markdown body
prayers: { date, request, attribution?, kind: "petition" | "thanksgiving",
           status: "active" | "answered" | "archived", expires? }
events:  { title, start, end?, location?, kind: "retreat" | "conference"
           | "gathering" | "ordination" | "deadline", url?, description? }
```

- Filter `draft: true` and expired prayers out of production builds.
- `status: "answered"` prayers get the gold top-border treatment.
- Events render as the calendar list AND compile to `/calendar.ics` (static endpoint,
  `src/pages/calendar.ics.ts` — a GET handler works fine in static output). One source, two outputs.

## Placeholder content — LAUNCH BLOCKER, mark it clearly

Wilson does not have the chair's real letters yet. Seed the repo with **3 letters, 5 prayers,
4 events** of placeholder content, using the titles/dates already in the mockup
(`After Corpus Christi`, `On appointment season`, `Eastertide and the long obedience`).

**Every placeholder file MUST carry `draft: true` in frontmatter and a `<!-- PLACEHOLDER -->` comment
at the top of the body.** The point is to show the chair what the site will look like — not to ship
invented words under his name. Do not publish a placeholder letter without `draft: true`.

Prose should be plausible pastoral prose in the mockup's register, not literal `lorem ipsum` —
but it is stand-in text and must be replaced before the site is announced.

## Forms — mailto only, for now

The prayer-wall submit button is a **`mailto:` link**, not a form post. No Formspree, no Netlify Forms,
no backend. Explicitly per Wilson.

Subject-prefill the mailto so moderation is sortable, e.g.
`mailto:...?subject=Prayer%20request%20—%20Order%20of%20Elders`.

Keep the posted moderation policy from the mockup verbatim — it's the mechanism by which
¶340.2.a(5) ("maintain all confidences inviolate") gets enforced on the web:

> Requests are reviewed before posting. Please share only what is yours to share — first names or
> initials for others, and no medical or personal details without consent.

## Map — placeholder in v1

Keep the mockup's CSS placeholder frame (`.mapframe`). Do NOT wire Mapbox yet — that needs the
geocoded `appointments.geojson` from the Río Texas Atlas plus a `PUBLIC_MAPBOX_TOKEN`. Defer.

When it does land: appointment data is public (it's in the Journal), so no gate. Popup shows church +
city, **never** the elder's contact info. Personal pins (home addresses, phones) never go on the
public map, even in v2.

## Build order

1. `package.json`, `astro.config.mjs` (static), `tsconfig.json`, `.gitignore`.
2. `src/styles/tokens.css` + `src/layouts/Base.astro` (fonts, tokens, reset, footer).
3. `src/pages/index.astro` — port `docs/landing.html`. Single static page.
4. `src/content.config.ts` + seed content (3 letters / 5 prayers / 4 events, all `draft: true`).
5. `src/pages/riotexas/index.astro` — port `docs/riotexas.html`, reading from the collections.
6. `src/pages/riotexas/letters/[slug].astro` — letter detail pages.
7. `src/pages/calendar.ics.ts` — .ics feed from the events collection.
8. `vercel.json` — framework=astro, outputDir=dist, **host rewrite** for the subdomain.
9. `pnpm build` must pass clean before any deploy.

## Deploy + DNS (needs Wilson's explicit OK — do not run unprompted)

- Vercel team: **wilson-pruitts-projects** (Labs). NOT the Covenant team — that's Circuit only.
- Commit author must be `littleeachdayapp-droid` / `littleeachdayapp@gmail.com`, or the
  wilson-pruitts-projects team **blocks the deploy**. This is expected, not a misconfiguration.
- DNS is on **Cloudflare**, DNS-only / grey-cloud, `A → 76.76.21.21`.
- ⚠️ **Wildcard SSL does not auto-issue on Cloudflare DNS** — Vercel needs a DNS-01 challenge it
  can't perform on external nameservers. So each subdomain must be added EXPLICITLY:
  `npx vercel domains add riotexas.orderofelders.org` → gets its own HTTP-01 cert.
  Every future conference subdomain needs this step too. This is the thing people forget.
- Add `www` → apex redirect.
- Confirm the apex → subdomain links resolve both directions after cutover.

## v2 — deliberately not now

Only `/directory` gets gated; the public site never asks anyone to log in. Start at a shared
passphrase (edge middleware + cookie, rotated annually after conference), announced at clergy session.
Elders opt in per-field (`visible: boolean`) — the gate protects the data, consent decides what's
behind it. Don't build Clerk accounts until someone asks twice.

## Open questions for the chair (Wilson to resolve, not the build)

- Sign-off process for editing the email archive into public letters. These were written to a closed
  list — get explicit per-letter sign-off before publishing.
- Who moderates prayers when Wilson and the chair are both at conference / on leave (name a third).
- Whether the landing invites other conferences from day one (the mockup assumes yes).
- Confirm the chair is comfortable with the disclaimer framing ("an independent project of elders,
  for elders; not an official agency of The United Methodist Church"), and whether the conference
  office should get a courtesy heads-up before launch.
