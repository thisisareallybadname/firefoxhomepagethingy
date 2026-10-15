const MS_PER_DAY = 86400000;
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// pad a number to two digits
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// local date as yyyy-mm-dd
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

// current local time as hh:mm
export function nowTime(): string {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

// yyyy-mm-dd back into a local date at midnight
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// whole days from a to b, negative when b is earlier
export function daysBetween(aKey: string, bKey: string): number {
  const a = fromDateKey(aKey);
  const b = fromDateKey(bKey);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

export function addDaysToKey(key: string, n: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

// friendly label like today, tomorrow, fri, or oct 21
export function relativeDay(key: string): string {
  const diff = daysBetween(todayKey(), key);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  const d = fromDateKey(key);
  if (diff > 1 && diff < 7) return DAY_NAMES[d.getDay()];
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// 13:05 becomes 1:05 pm unless 24h is on
export function formatTime(time: string, use24h: boolean): string {
  if (!time) return "";
  if (use24h) return time;
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${pad2(m)} ${h < 12 ? "am" : "pm"}`;
}
