import type { APIRoute } from "astro";
import { publishedEvents } from "../../../lib/content";
import { buildIcsFeed } from "../../../lib/ics";

export const GET: APIRoute = async () => {
  const events = await publishedEvents("deacons", "riotexas");
  const body = buildIcsFeed({ domain: "orderofdeacons.org", name: "Order of Deacons" }, events);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="order-of-deacons-riotexas.ics"',
    },
  });
};
