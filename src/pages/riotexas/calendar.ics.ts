import type { APIRoute } from "astro";
import { publishedEvents } from "../../lib/content";

/** iCalendar DTEND is exclusive for all-day events: a June 14–17 conference ends June 18. */
function dayAfter(d: Date): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function icsDate(d: Date, allDay: boolean): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  if (allDay) return stamp;
  return `${stamp}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export const GET: APIRoute = async () => {
  const events = await publishedEvents();

  const veventBlocks = events
    .map((event) => {
      const start = icsDate(event.data.start, true);
      const end = icsDate(dayAfter(event.data.end ?? event.data.start), true);
      const lines = [
        "BEGIN:VEVENT",
        `UID:${event.id}@orderofelders.org`,
        `DTSTAMP:${icsDate(new Date(0), false)}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeText(event.data.title)}`,
      ];
      if (event.data.location) lines.push(`LOCATION:${escapeText(event.data.location)}`);
      if (event.data.description) lines.push(`DESCRIPTION:${escapeText(event.data.description)}`);
      lines.push("END:VEVENT");
      return lines.join("\r\n");
    })
    .join("\r\n");

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Order of Elders//Río Texas//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Order of Elders — Río Texas",
    veventBlocks,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="order-of-elders-riotexas.ics"',
    },
  });
};
