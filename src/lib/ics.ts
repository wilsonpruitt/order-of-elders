import type { CollectionEntry } from "astro:content";

export interface IcsSite {
  /** Used in UID/PRODID/filename — the order's apex domain, e.g. "orderofelders.org" */
  domain: string;
  /** Human name for X-WR-CALNAME, e.g. "Order of Elders" */
  name: string;
}

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

export function buildIcsFeed(site: IcsSite, events: CollectionEntry<"events">[]): string {
  const veventBlocks = events
    .map((event) => {
      const start = icsDate(event.data.start, true);
      const end = icsDate(dayAfter(event.data.end ?? event.data.start), true);
      const lines = [
        "BEGIN:VEVENT",
        `UID:${event.id}@${site.domain}`,
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

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Río Texas//EN`,
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${site.name} — Río Texas`,
    veventBlocks,
    "END:VCALENDAR",
  ].join("\r\n");
}
