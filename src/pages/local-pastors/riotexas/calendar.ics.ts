import type { APIRoute } from "astro";
import { publishedEvents } from "../../../lib/content";
import { buildIcsFeed } from "../../../lib/ics";

export const GET: APIRoute = async () => {
  const events = await publishedEvents("local-pastors", "riotexas");
  const body = buildIcsFeed(
    { domain: "fellowshipoflocalpastors.org", name: "Fellowship of Local Pastors and Associate Members" },
    events,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fellowship-local-pastors-riotexas.ics"',
    },
  });
};
