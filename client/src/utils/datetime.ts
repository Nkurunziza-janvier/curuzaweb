function formatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function dateTimeInputValue(value: string | Date, timeZone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = formatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? "00" : values.hour;
  return `${values.year}-${values.month}-${values.day}T${hour}:${values.minute}`;
}

function offsetMs(date: Date, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? 0 : Number(values.hour);
  const wallClock = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), hour, Number(values.minute), Number(values.second));
  return wallClock - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedInputToIso(value: string, timeZone: string) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const wallClock = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);
  let timestamp = wallClock;
  for (let index = 0; index < 3; index += 1) {
    const offset = offsetMs(new Date(timestamp), timeZone);
    const next = wallClock - offset;
    if (next === timestamp) break;
    timestamp = next;
  }
  return new Date(timestamp).toISOString();
}

export function formatBookingDate(value: string, timeZone: string, locale: string, dateStyle: "full" | "long" | "medium" = "medium", timeStyle: "short" | undefined = "short") {
  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle, timeZone }).format(new Date(value));
}
