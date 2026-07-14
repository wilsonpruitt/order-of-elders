# order-of-elders

One Astro app, one Vercel project, host-based routing — serving three sites:

- **orderofelders.org** — The Order of Elders (`src/pages/elders/`)
- **orderofdeacons.org** — The Order of Deacons (`src/pages/deacons/`)
- **fellowshipoflocalpastors.org** — The Fellowship of Local Pastors and Associate Members (`src/pages/local-pastors/`)

Each apex has a `riotexas/` sister page for the Río Texas Annual Conference. `orderoflocalpastors.org`
redirects to `fellowshipoflocalpastors.org` at the domain level (not in `vercel.json`).

The repo, directory, and Vercel project are still named `order-of-elders` — a slightly odd name now
that it serves three orders. Renaming would touch the GitHub remote, the Vercel link, and the deploy
for cosmetics only, so it was left as-is. See `BUILD.md` and `BUILD-SISTERS.md` for the full build
history and architecture decisions.
