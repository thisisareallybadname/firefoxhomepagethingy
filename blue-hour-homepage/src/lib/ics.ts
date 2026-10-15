import { addDaysToKey, pad2, todayKey, toDateKey } from "./dates";

export interface IcsEvent {
  uid: string;
  title: string;
  date: string;
  time: string;
  note: string;
}

interface Stamp {
  date: Date;
  allDay: boolean;
}

interface RawEvent {
  uid: string;
  summary: string;
  location: string;
  start: Stamp | null;
  rule: string;
  recurrenceId: string;
  exdates: string[];
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MAX_LOOP_DAYS = 3650;

// long lines are folded, glue continuation lines back on
function unfold(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const isContinuation = line.startsWith(" ") || line.startsWith("\t");
    if (isContinuation && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

// undo the backslash escapes used in ics text
function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_match, char: string) => (char === "n" || char === "N" ? " " : char));
}

// reads 20261021, 20261021T140000 and the Z (utc) form, tzid times count as local
function parseStamp(value: string): Stamp | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (m[4] === undefined) return { date: new Date(year, month, day), allDay: true };
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? 0);
  if (m[7]) return { date: new Date(Date.UTC(year, month, day, hour, minute, second)), allDay: false };
  return { date: new Date(year, month, day, hour, minute, second), allDay: false };
}

// FREQ=WEEKLY;BYDAY=MO,WE into a lookup
function parseRule(value: string): Record<string, string> {
  const rule: Record<string, string> = {};
  for (const part of value.split(";")) {
    const [key, val] = part.split("=");
    if (key && val) rule[key.toUpperCase()] = val;
  }
  return rule;
}

// daily and weekly repeats only, anything fancier gives just the first date
function expandDates(start: Date, rule: Record<string, string>, horizonKey: string): Date[] {
  if (rule.FREQ !== "DAILY" && rule.FREQ !== "WEEKLY") return [start];
  const interval = Math.max(1, Number(rule.INTERVAL) || 1);
  const maxCount = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const until = rule.UNTIL ? parseStamp(rule.UNTIL) : null;
  const untilKey = until ? toDateKey(until.date) : horizonKey;
  const lastKey = untilKey < horizonKey ? untilKey : horizonKey;
  const weekdays = rule.BYDAY
    ? rule.BYDAY.split(",").map((code) => DAY_CODES.indexOf(code.slice(-2)))
    : [start.getDay()];
  const mondayOffset = (start.getDay() + 6) % 7;
  const dates: Date[] = [];
  for (let i = 0; i < MAX_LOOP_DAYS && dates.length < maxCount; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, start.getHours(), start.getMinutes());
    if (toDateKey(day) > lastKey) break;
    const weekIndex = Math.floor((i + mondayOffset) / 7);
    const fits =
      rule.FREQ === "DAILY"
        ? i % interval === 0
        : weekIndex % interval === 0 && weekdays.includes(day.getDay());
    if (i === 0 || fits) dates.push(day);
  }
  return dates;
}

// first pass, pull the fields we care about out of each VEVENT
function readRawEvents(lines: string[]): RawEvent[] {
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { uid: "", summary: "", location: "", start: null, rule: "", recurrenceId: "", exdates: [] };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);
    if (name === "UID") current.uid = value;
    else if (name === "SUMMARY") current.summary = unescapeText(value);
    else if (name === "LOCATION") current.location = unescapeText(value);
    else if (name === "DTSTART") current.start = parseStamp(value);
    else if (name === "RRULE") current.rule = value;
    else if (name === "RECURRENCE-ID") current.recurrenceId = value;
    else if (name === "EXDATE") {
      for (const part of value.split(",")) {
        current.exdates.push(`${part.slice(0, 4)}-${part.slice(4, 6)}-${part.slice(6, 8)}`);
      }
    }
  }
  return events;
}

// canvas titles end with the course in brackets, split it off
function splitCourse(summary: string): { title: string; course: string } {
  const m = summary.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  return m ? { title: m[1], course: m[2] } : { title: summary, course: "" };
}

function makeEvent(raw: RawEvent, uid: string, start: Date, allDay: boolean): IcsEvent {
  const { title, course } = splitCourse(raw.summary);
  return {
    uid,
    title: title || "untitled",
    date: toDateKey(start),
    time: allDay ? "" : `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
    note: course || raw.location,
  };
}

// turns an .ics file into upcoming events within the horizon
export function parseIcs(text: string, horizonDays: number): IcsEvent[] {
  const raws = readRawEvents(unfold(text));
  const firstKey = todayKey();
  const lastKey = addDaysToKey(firstKey, horizonDays);
  const found = new Map<string, IcsEvent>();
  const overrides: RawEvent[] = [];

  for (const raw of raws) {
    if (!raw.start) continue;
    if (raw.recurrenceId) {
      overrides.push(raw);
      continue;
    }
    const rule = raw.rule ? parseRule(raw.rule) : null;
    const starts = rule ? expandDates(raw.start.date, rule, lastKey) : [raw.start.date];
    for (const start of starts) {
      const key = toDateKey(start);
      if (raw.exdates.includes(key)) continue;
      const uid = rule ? `${raw.uid}@${key}` : raw.uid;
      found.set(uid, makeEvent(raw, uid, start, raw.start.allDay));
    }
  }

  // moved single occurrences replace the generated one
  for (const raw of overrides) {
    const original = parseStamp(raw.recurrenceId);
    if (!raw.start || !original) continue;
    const uid = `${raw.uid}@${toDateKey(original.date)}`;
    found.set(uid, makeEvent(raw, uid, raw.start.date, raw.start.allDay));
  }

  return [...found.values()].filter((ev) => ev.date >= firstKey && ev.date <= lastKey);
}
