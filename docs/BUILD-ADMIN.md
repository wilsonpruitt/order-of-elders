# Chair logins + content submission — order-of-elders

> **Status: PLANNED, NOT STARTED.** Deferred 2026-07-14 — revisit when there is more
> interest from the chairs and there is appetite to set up Supabase. Nothing in this
> document has been built; the site remains fully static with no auth and no backend.
>
> **Start here:** Stage 0 (bottom of this file) is entirely Supabase + GitHub setup and
> needs no code. **Blocked on a non-technical decision:** a backup prayer moderator must
> be named, or nothing posts to any of the three walls while Wilson is away.
>
> Sibling docs: `BUILD.md` (original handoff), `BUILD-SISTERS.md` (the three-order
> expansion), `docs/SPEC.md` (the auth "rungs" this plan implements as Rung 3).

## Context

Today the site has no auth, no forms, and no backend. Content collections (markdown in
`src/content/{letters,prayers,events}`) are the entire data layer, and the only route for a
prayer request is a `mailto:` link on a domain **with no MX records** — it goes nowhere.
Letters reach the site through `scripts/ingest-missives.py`, a local script Wilson runs by hand
against a Google Drive export.

The three chairs (elders, deacons, local pastors) need to log in and submit prayer requests,
letters, and calendar events themselves.

**We are not adding a database.** Three chairs posting a letter a week is not database-shaped
volume, and the current design has a property worth protecting: the zod schema is a *build
gate* — a letter carrying a tag outside the frozen vocabulary in `src/lib/tags.ts` fails
`astro build`. Moving content to Postgres would trade that compile-time guarantee for runtime
hope. Instead: a form posts to a serverless route, the route validates against the same zod
schema, commits a markdown file to the repo, and Vercel rebuilds. Git stays the store and the
audit trail.

`docs/SPEC.md` anticipated this exactly — its "Rung 3" auth says *don't build accounts until
someone asks twice*, and names attributed prayer submissions as the trigger.

### Decisions (settled with Wilson)
| | |
|---|---|
| Store | Git-backed markdown. No DB, ever. |
| Auth | Supabase Auth, email OTP. Auth only — no app tables. |
| Publishing | Chairs publish their own **letters and events** directly. **Prayers always land as `draft: true`** and Wilson approves from a queue. |
| Letters | **Elders only.** Deacons/local-pastors chairs get prayers + events. |
| Admin host | One neutral host. Start on the Vercel production URL; swap later via one env var. |
| Rejected prayers | Deleted file; text remains in git history. Acceptable — **the repo is private.** |

### Two corrections to the original framing
1. **`app_metadata`, not `user_metadata`.** `user_metadata` is writable by the user with their
   own session — a deacons chair could set `{"order":"elders"}` on themselves and pass every
   check. `app_metadata` is writable only by the service-role key. Same hand-set ergonomics;
   the difference is whether authorization is real.
2. **`vercel.json` `routes` cannot coexist with the Vercel adapter.** Vercel's docs say so
   explicitly. The six host rewrites must move into the adapter's Build Output config. This is
   the single change that can take all six sites down.

---

## Blockers to resolve before Stage 2

- **Name a backup moderator.** With Wilson as sole approver, no prayer posts on any of the
  three walls while he is at conference or on leave. `BUILD.md` already flags this as an open
  question; the queue makes it load-bearing.

---

## 1. Rendering + routing  ⚠️ highest risk

`astro.config.mjs`: keep `output: 'static'`, add `adapter: vercel()`. Everything prerenders by
default; only `src/pages/admin/**` and `src/pages/api/**` get `export const prerender = false`.
Astro's `src/middleware.ts` runs only for on-demand routes in a static build, so public pages
stay pure CDN hits with zero compute.

**The host rewrites must move out of `vercel.json`.** New `integrations/host-routes.mjs`, hooked
after `vercel()`. On `astro:build:done` it reads `.vercel/output/config.json` and splices the six
existing rewrite rules into `routes` immediately before `{ handle: "filesystem" }`. It must
**throw** if it can't find that handler — a loud build failure beats a silent routing regression.

`vercel.json` reduces to `{ "framework": "astro", "outputDirectory": "dist" }`.

Because admin lives on its own host, none of the six `has: host` rules match it — `/admin/*` and
`/api/*` fall straight through to the filesystem, and the rewrite-carve-out problem disappears.

*Also fix while here:* the current 404 rule points at `/404.html`, which **does not exist**. Add
`src/pages/404.astro`.

## 2. Auth + authorization

Supabase project, **public signups disabled**, 4 users created by hand. Each user's
`raw_app_meta_data` set in the dashboard:
`{ "order": "elders", "roles": ["chair"] }` … Wilson gets `["chair","moderator","admin"]`.

- `src/lib/supabase.ts` — `createServerClient` from `@supabase/ssr` with an Astro cookie adapter
  (`httpOnly`, `secure`, `sameSite: 'lax'`). Port the shape from
  `~/field-guide/src/lib/supabase/server.ts`.
- `src/pages/admin/login.astro` — `signInWithOtp({ email, options: { shouldCreateUser: false }})`
  → 6-digit code → `verifyOtp`. `shouldCreateUser: false` **is** the allowlist: an unknown email
  never receives a code.
- `src/middleware.ts` — calls `supabase.auth.getUser()` (**not** `getSession()`; it verifies the
  JWT rather than trusting the cookie payload). Builds `locals.principal` from `app_metadata`.
  Missing/invalid `order` → 403, fail closed. Enforces `Origin === ADMIN_ORIGIN` on all mutating
  methods.

**`src/lib/auth.ts` — the part that must not be gotten wrong:**

- **`order` is NEVER read from the request body.** It is written from `principal.order`. A
  payload carrying an `order` key is a 403.
- **Events are the one real cross-tenant write vector.** `events.orders` is an *array* — a
  deacons chair submitting `orders: ["elders"]` would write into the elders' calendar.
  `clampOrders(principal, requested)` must assert `requested ⊆ {principal.order}` for a chair
  (admin may select any).
- Letters require `principal.order === 'elders' && roles.includes('chair')` — enforced in the
  route, not just hidden from the nav.
- Prayers: server forces `draft: true`, `status: 'active'`, `order` from principal.
- `conference` is hardcoded `'riotexas'` server-side.

## 3. Committing to GitHub

`src/lib/github.ts`, using the REST **Contents API** (`PUT /repos/{repo}/contents/{path}`).

```ts
const BRANCH = "master";   // NOT main — a hardcoded "main" 404s silently
// The wilson-pruitts-projects team BLOCKS deploys whose commit author is not this
// identity. Change these and the commit lands but no build ever runs. See BUILD.md.
const IDENTITY = { name: "littleeachdayapp-droid", email: "littleeachdayapp@gmail.com" };
```
Send `author` **and** `committer` on every write.

**Token:** fine-grained PAT owned by `littleeachdayapp-droid`, scoped to this one repo,
permission `Contents: Read and write`, stored as `GITHUB_TOKEN` (no `PUBLIC_` prefix, so Astro
never bundles it clientside). *These expire (max 1 year) — set a calendar reminder, because when
it lapses publishing dies with a silent 401.*

Slugs validated against `/^[a-z0-9][a-z0-9-]{0,60}$/` — never interpolate raw user text into a
path. Collisions: pre-check, then `-2`/`-3` suffix. Concurrent writes: retry ×3 with a fresh blob
`sha` and backoff.

## 4. The build gate — validate before committing

Extract the three `z.object({...})` bodies from `src/content.config.ts` into **`src/lib/schemas.ts`**,
imported by both `content.config.ts` and the API routes. Add `zod` as an explicit dep (pnpm already
resolves 3.25.76 transitively, so it dedupes).

**`src/lib/frontmatter.ts` — validate the round-trip, not the payload:** serialize the file with a
real YAML library → re-parse the serialized bytes → `schema.parse()` → *only then* commit. This
guarantees the exact bytes entering git are bytes the build accepts. (The Python script builds YAML
with f-strings; a title containing a quote would break it. Never hand-roll YAML from user input.)

## 5. Submission flows

**Prayers** — `/admin/prayers/new` → `POST /api/prayers`. Fields: request, kind, optional
attribution (with the ¶340 policy text from `PrayerWall.astro:40` shown inline), optional expires
(default +60 days so the wall self-cleans). Server forces draft/status/order/date.

**Events** — `/admin/events/new` → `POST /api/events`. Chairs publish directly (`draft: false`).
`orders` checkboxes, **clamped server-side**.

**Letters** (elders chair only) — two-phase, because the derived metadata is the point:
1. Pick the Sunday from a `<select>` of ~8 around today, labelled *"Sunday, July 12 — Proper 10 (15)"*.
2. The form then shows, **read-only**: the letter's `date` (the Wednesday before), occasion,
   season, and the day's appointed readings. They are derived, and showing them derived is how
   the chair learns to trust the machine.
3. **Epigraph:** select one of the day's readings, then narrow it (`13:3`) → server composes
   `refKey` from the reading's OSIS book, validated against `OSIS_BOOKS`.
4. **Tags:** four checkbox groups rendered straight from `FACETS` in `src/lib/tags.ts` — pickers
   only, no free text, re-validated server-side. A bad tag is a broken deploy, not a bad row.
5. Preview (reusing the `[slug].astro` rendering) → Publish.
6. On submit the server **re-derives** date/occasion/season/readings from the chosen Sunday. It
   never trusts derived fields sent by the client.

### Vendoring the lectionary
`rcl.json` currently lives outside the repo (`~/reception-corpus/data/rcl.json`). Copy it whole to
**`src/data/rcl.json`** (236 KB; contains Years **A, B and C** — the *script* is Year-A-only, the
*data* is not, so don't subset it or 2027 breaks).

**`src/lib/liturgy.ts`** — TS port of the derivation now living in `ingest-missives.py`:
`easter(year)` (computus; assert 2026-04-05), `lectionaryYear()` (anchor: Advent 2025 opened Year A
→ 2027 is Year B), `occasionForSunday()` (Propers are **date**-anchored, not Easter-anchored), and
`wednesdayBefore()`.

**Free acceptance test:** `ingest-missives.py` holds 37 hand-verified `(occasionId, sunday)` pairs
and 4 hand-verified letter dates. Port them as a fixture; if the TS derivation reproduces all 37,
the port is correct.

## 6. Prayer moderation — what "approve" means in git

`/admin/prayers/queue` (moderator only). It reads pending prayers **live from the GitHub API**, not
from `getCollection()` — the content store reflects only the last successful *build*, so a prayer
submitted two minutes ago would be invisible, and a moderator could act on stale state.

- **Approve** = fetch file + `sha` → flip `draft: false` → re-validate → `PUT` with the `sha`
  (optimistic concurrency; GitHub 409s if someone else touched it). A second commit. Vercel rebuilds.
  It appears on the wall ~90s later. **Approve is a commit that flips one boolean.**
- **Reject** = `DELETE` with the `sha`. The text remains in git history — accepted, private repo.
- The prayers schema has **no submitter field**. Record the submitter in the *commit message* and
  surface it in the queue by reading the file's last commit — cleaner than adding a schema field
  that would then ship in the build output.

## 7. Scheduled rebuild — ✅ ALREADY BUILT (2026-07-14, commit 7e81ab7)

**This section is done. Do not rebuild it.** It was pulled forward out of this plan because the
chair's eight unsent letters needed timing immediately.

Shipped:
- `.github/workflows/scheduled-rebuild.yml` — daily at 08:00 UTC (03:00 America/Chicago), pings a
  Vercel deploy hook. Requires the `VERCEL_DEPLOY_HOOK` repository secret, **which is already set.**
  Fails loudly if it ever goes missing.
- `isPublishable` (`src/lib/content.ts`) now carries the letters-only future-date guard, so `draft`
  means "never publish" and the date means "publish on that day."
- `scripts/ingest-missives.py` no longer auto-drafts future letters — it schedules them.

Verified end to end: the workflow ran, the hook fired, Vercel built, and letters publish one per
Wednesday. This also makes prayer `expires` dates work, which they previously did not — so the
prayer-moderation flow in §6 can rely on the clock already ticking.

## 8. Failure modes

| Failure | Behavior | Mitigation |
|---|---|---|
| Bad tag / bad frontmatter | Would break `astro build` | Round-trip zod validation before commit; tags are pickers. Rejected with a 400; the chair's text is preserved. |
| **Commit lands, build fails** | Site stays up (last good deploy) — **but every later submission piles up behind the poison commit, invisibly** | *The real risk.* Vercel failure notifications to Wilson, **plus** an admin banner querying the Vercel API: *"Your letter is saved but the site failed to publish — Wilson has been notified."* |
| Wrong commit author | Commit lands, **no build ever runs**, content silently never appears | Author is a hardcoded, commented constant — not a loose env var. |
| Token expired | 401 on write | Clear error, form re-renders with text intact, `localStorage` autosave on the letter form so 800 words are never lost. |

## 9. Env vars

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (client-visible by design) ·
`GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH=master`, `ADMIN_ORIGIN` (server only) ·
`VERCEL_DEPLOY_HOOK` (GitHub Actions secret).

**No `SUPABASE_SERVICE_ROLE_KEY` in Vercel** — `app_metadata` is set by hand in the dashboard; the
app never writes it. Worth the small inconvenience to keep the key out of the deployment.

*Note:* `.gitignore` has `!.env.example` on line 6 but a blanket `.env*` on line 8, which re-ignores
it. Fix the order before committing an example file.

---

## Staging

- **Stage 0 — no code.** Create the Supabase project, disable signups, create 4 users, set
  `app_metadata`. Mint the PAT. Decide the admin hostname (default: the Vercel production URL).
- **Stage 1 — routing + auth shell, shipped ALONE.** Adapter, host-routes integration, `vercel.json`
  reduced, middleware, login, a dashboard that says *"You are signed in as Celia, chair of the Order
  of Elders."* **No write path at all.** This is the change that can break all six sites; it earns
  its own deploy.
- **Stage 2 — prayers end to end.** Schema extraction, `frontmatter.ts`, `github.ts`, the queue,
  approve/reject. Kill the dead `mailto:`. Simplest content type, exercises the whole
  commit→build→publish loop. (The nightly rebuild it depends on is **already shipped** — see §7.)
  *Blocked on naming a backup moderator.*
- **Stage 3 — events.** Same machinery + the `clampOrders` cross-tenant guard. Gives the deacons and
  local-pastors chairs something to do.
- **Stage 4 — letters.** Vendored `rcl.json`, `liturgy.ts` + the 37-pair fixture, tag pickers,
  preview, the future-date guard. Biggest chunk, elders-only, and it can wait — the chair has a
  working Python pipeline today.
- **Stage 5 — polish.** Deploy-status banner, submission history, `404.astro`.

## Verification

- **Stage 1 is the one that must be proven, not assumed.** After adding the adapter, confirm **all
  six hosts** still resolve and are still statically served — preview URLs don't carry production
  hostnames, so test with a `Host` header override (`curl -H "Host: riotexas.orderofdeacons.org"`)
  or assign the domains to a preview deploy. Confirm `dist/` still contains the prerendered HTML for
  every public page and that only `/admin` + `/api` became functions.
- Logged out, `/api/prayers` returns 401; `/admin/*` redirects to login.
- **Authorization, the test that matters:** signed in as the *deacons* chair, POST an event with
  `orders: ["elders"]` and a prayer with `order: "elders"` — both must 403. Then confirm no elders
  content was written.
- Submit a prayer → assert the committed file has `draft: true` → assert it does **not** appear on
  the public wall after the rebuild → approve it → assert it does.
- Submit a letter with a tag outside the frozen vocabulary (by hand-crafting the POST, bypassing the
  picker) → must be rejected with a 400 and **no commit made**.
- Port the 37-pair fixture from `ingest-missives.py` and assert `liturgy.ts` reproduces every
  occasion and every Wednesday date.
- `pnpm build` stays green throughout.

## Critical files

`vercel.json` (routing — the deploy hinges on it) · `astro.config.mjs` (adapter + host-routes) ·
`src/content.config.ts` → schemas extracted to **`src/lib/schemas.ts`** (the shared build gate) ·
`src/lib/content.ts` (`isPublishable` — the time gate the cron exists to trip) ·
`src/lib/tags.ts` (`FACETS` drives every tag picker) ·
`scripts/ingest-missives.py` (source of truth for the liturgy port + its fixture) ·
`~/field-guide/src/lib/supabase/server.ts` and `src/proxy.ts` (Supabase-SSR + host-routing precedents to port)
