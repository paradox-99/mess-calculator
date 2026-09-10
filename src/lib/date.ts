// Date helpers.
//
// Two rules keep dates honest here:
//
// 1. "Today" is resolved in APP_TIME_ZONE (Asia/Dhaka by default), the way
//    Django's TIME_ZONE did — the server's own clock zone is irrelevant.
// 2. A calendar date is stored as UTC midnight (Prisma `@db.Date`). Build them
//    only with `utcDate()` so a day never drifts across a timezone boundary.

const TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Dhaka";

export type YearMonth = { year: number; month: number };

/** A calendar date pinned to UTC midnight, safe to store in a `@db.Date` column. */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Today's calendar date in APP_TIME_ZONE, as UTC midnight. */
export function today(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return utcDate(get("year"), get("month"), get("day"));
}

export function currentYearMonth(): YearMonth {
  const now = today();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/** ISO `YYYY-MM-DD` for a stored date, for `<input type="date">` and links. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses `YYYY-MM-DD` to UTC midnight. Returns null if it isn't a real date. */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = utcDate(Number(y), Number(m), Number(d));
  // Rejects things like 2026-02-31, which Date.UTC would silently roll over.
  if (date.getUTCMonth() + 1 !== Number(m) || date.getUTCDate() !== Number(d)) {
    return null;
  }
  return date;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "Tue, Sep 8, 2026" from a `YYYY-MM-DD` string, built from the UTC parts by
 * hand rather than with Intl, so a server-rendered label and the browser
 * cannot disagree about locale and cause a hydration mismatch.
 */
export function formatISODateLabel(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return "Pick a date";
  const weekday = WEEKDAYS_SHORT[date.getUTCDay()];
  const month = MONTHS_SHORT[date.getUTCMonth()];
  return `${weekday}, ${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function previousMonth({ year, month }: YearMonth): YearMonth {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth({ year, month }: YearMonth): YearMonth {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** "September, 2026" — matches the Django template's `%B, %Y`. */
export function monthLabel({ year, month }: YearMonth): string {
  const name = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(utcDate(year, month, 1));
  return `${name}, ${year}`;
}

/** `YYYY-MM`, the value used by the month `<select>` controls. */
export function monthValue({ year, month }: YearMonth): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

/**
 * Resolves the month a page is looking at from its search params, accepting
 * either `?month_choice=YYYY-MM` (the dropdowns) or `?year=&month=` (the
 * prev/next links). Falls back to the current month for anything unparseable,
 * exactly like the Django `_month_from_request` helper did.
 */
export function monthFromParams(params: {
  month_choice?: string;
  year?: string;
  month?: string;
}): YearMonth {
  const fallback = currentYearMonth();
  let year: number;
  let month: number;

  if (params.month_choice) {
    const [rawYear, rawMonth] = params.month_choice.split("-", 2);
    year = Number(rawYear);
    month = Number(rawMonth);
  } else {
    year = params.year === undefined ? fallback.year : Number(params.year);
    month = params.month === undefined ? fallback.month : Number(params.month);
  }

  if (!Number.isInteger(year) || !Number.isInteger(month)) return fallback;
  if (month < 1 || month > 12 || year < 1 || year > 9999) return fallback;
  return { year, month };
}

/** Day-of-month plus weekday, as the daily-details table shows them. */
export function dayCell(date: Date): { day: string; weekday: string } {
  return {
    day: String(date.getUTCDate()),
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

/** "2026-09-08 14:03" for the audit log's timestamp column. */
export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
}

/** "Sep 8, 2026" for the "closed on …" notice. */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
