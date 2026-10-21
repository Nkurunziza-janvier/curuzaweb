export const DEFAULT_TIMEZONE = "Africa/Kigali";

export interface DateKeyParts {
  year: number;
  month: number;
  day: number;
}

export function parseDateKey(value: string): DateKeyParts {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("Date must use YYYY-MM-DD");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function dateKeyFromParts({ year, month, day }: DateKeyParts): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDateDays(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return dateKeyFromParts({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() });
}

export function eachDateKey(from: string, to: string, limit = 62): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to && dates.length < limit) {
    dates.push(cursor);
    cursor = addDateDays(cursor, 1);
  }
  return dates;
}

export function weekdayForDateKey(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export function dateKeyFor(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const parts = formatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function localTimeFor(date: Date, timeZone = DEFAULT_TIMEZONE): { dateKey: string; minutes: number } {
  const parts = formatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? 0 : Number(values.hour);
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minutes: hour * 60 + Number(values.minute),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? 0 : Number(values.hour);
  const wallClock = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), hour, Number(values.minute), Number(values.second));
  return wallClock - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedTimeToUtc(dateKey: string, minutes: number, timeZone = DEFAULT_TIMEZONE): Date {
  const { year, month, day } = parseDateKey(dateKey);
  const wallClock = Date.UTC(year, month - 1, day, 0, minutes);
  let timestamp = wallClock;
  for (let index = 0; index < 3; index += 1) {
    const offset = offsetMs(new Date(timestamp), timeZone);
    const next = wallClock - offset;
    if (next === timestamp) break;
    timestamp = next;
  }
  return new Date(timestamp);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function slotLabel(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function minutesToLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function labelToMinutes(value: string): number {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error("Time must use HH:mm");
  return Number(match[1]) * 60 + Number(match[2]);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let existing = formatters.get(timeZone);
  if (!existing) {
    existing = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, existing);
  }
  return existing;
}
