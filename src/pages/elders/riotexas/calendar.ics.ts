import type { APIRoute } from "astro";
import { publishedEvents } from "../../../lib/content";
import { buildIcsFeed } from "../../../lib/ics";

export const GET: APIRoute = async () => {
  const events = await publishedEvents("elders", "riotexas");
  const body = buildIcsFeed({ domain: "orderofelders.org", name: "Order of Elders" }, events);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="order-of-elders-riotexas.ics"',
    },
  });
};
