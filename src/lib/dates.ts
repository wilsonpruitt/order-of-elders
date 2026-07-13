const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Content-collection dates are UTC midnight (z.coerce.date() on "YYYY-MM-DD");
// use UTC getters throughout so the rendered date never shifts a day with the server's local timezone.
export function formatFullDate(d: Date): string {
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatShortMonth(d: Date): string {
  return MONTHS_SHORT[d.getUTCMonth()];
}

export function formatDay(d: Date): number {
  return d.getUTCDate();
}
