import type { EventItem, SourceId } from "../types";
import { PURGE_AFTER_DAYS } from "../config";
import { addDaysToKey, todayKey } from "./dates";
import type { IcsEvent } from "./ics";
import { loadJson, saveJson } from "./storage";

const EVENTS_KEY = "events";
const REMOVED_KEY = "removedUids";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export interface EventDraft {
  title: string;
  date: string;
  time: string;
  note: string;
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// check one stored or restored item, fills gaps and drops junk
function cleanItem(value: unknown): EventItem | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const source = v.source === "canvas" || v.source === "calendar" ? v.source : null;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  const date = typeof v.date === "string" && DATE_PATTERN.test(v.date) ? v.date : "";
  if (!source || !title || !date) return null;
  return {
    id: typeof v.id === "string" && v.id ? v.id : makeId(),
    source,
    title,
    date,
    time: typeof v.time === "string" && TIME_PATTERN.test(v.time) ? v.time : "",
    note: typeof v.note === "string" ? v.note : "",
    done: v.done === true,
    uid: typeof v.uid === "string" ? v.uid : "",
    edited: v.edited === true,
  };
}

function cleanItems(list: unknown[]): EventItem[] {
  return list.map(cleanItem).filter((item): item is EventItem => item !== null);
}

// finds a list inside a backup file, old plain arrays count as the items list
function pickList(data: unknown, key: string): unknown[] | null {
  if (Array.isArray(data)) return key === "items" ? data : null;
  if (typeof data === "object" && data !== null) {
    const list = (data as Record<string, unknown>)[key];
    if (Array.isArray(list)) return list;
  }
  return null;
}

function sortKey(item: EventItem): string {
  return `${item.date} ${item.time || "00:00"}`;
}

export class EventStore {
  private items: EventItem[] = [];
  private removedUids = new Set<string>();
  private listeners: Array<() => void> = [];

  constructor() {
    this.reload();
    this.purgeOld();
    // another homepage tab changed the data
    window.addEventListener("storage", () => {
      this.reload();
      this.notify();
    });
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  // items for one source, earliest first
  getBySource(source: SourceId): EventItem[] {
    return this.items.filter((it) => it.source === source).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }

  add(source: SourceId, draft: EventDraft): void {
    this.items.push({ id: makeId(), source, ...draft, done: false, uid: "", edited: false });
    this.commit();
  }

  update(id: string, draft: EventDraft): void {
    const item = this.items.find((it) => it.id === id);
    if (!item) return;
    Object.assign(item, draft, { edited: true });
    this.commit();
  }

  toggleDone(id: string): void {
    const item = this.items.find((it) => it.id === id);
    if (!item) return;
    item.done = !item.done;
    this.commit();
  }

  // imported items are remembered as removed so a re-import skips them
  remove(id: string): void {
    const item = this.items.find((it) => it.id === id);
    if (item && item.uid) this.removedUids.add(item.uid);
    this.items = this.items.filter((it) => it.id !== id);
    this.commit();
  }

  // adds new imported items, updates ones you have not edited by hand
  mergeImported(source: SourceId, incoming: IcsEvent[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    for (const ev of incoming) {
      if (this.removedUids.has(ev.uid)) continue;
      const existing = this.items.find((it) => it.source === source && it.uid === ev.uid);
      if (!existing) {
        this.items.push({
          id: makeId(),
          source,
          title: ev.title,
          date: ev.date,
          time: ev.time,
          note: ev.note,
          done: false,
          uid: ev.uid,
          edited: false,
        });
        added++;
        continue;
      }
      const changed =
        existing.title !== ev.title || existing.date !== ev.date || existing.time !== ev.time || existing.note !== ev.note;
      if (!existing.edited && changed) {
        existing.title = ev.title;
        existing.date = ev.date;
        existing.time = ev.time;
        existing.note = ev.note;
        updated++;
      }
    }
    if (added > 0 || updated > 0) this.commit();
    return { added, updated };
  }

  // everything needed to rebuild the lists later
  exportData(): { version: number; items: EventItem[]; removed: string[] } {
    return { version: 1, items: this.items, removed: [...this.removedUids] };
  }

  // returns how many items came back, or -1 when the file is not a backup
  restore(data: unknown): number {
    const list = pickList(data, "items");
    if (!list) return -1;
    this.items = cleanItems(list);
    const removed = pickList(data, "removed") ?? [];
    this.removedUids = new Set(removed.filter((uid): uid is string => typeof uid === "string"));
    this.commit();
    return this.items.length;
  }

  private reload(): void {
    const savedItems = loadJson<unknown>(EVENTS_KEY, []);
    const savedRemoved = loadJson<unknown>(REMOVED_KEY, []);
    this.items = Array.isArray(savedItems) ? cleanItems(savedItems) : [];
    const removed = Array.isArray(savedRemoved) ? savedRemoved : [];
    this.removedUids = new Set(removed.filter((uid): uid is string => typeof uid === "string"));
  }

  private purgeOld(): void {
    const cutoff = addDaysToKey(todayKey(), -PURGE_AFTER_DAYS);
    const kept = this.items.filter((it) => it.date >= cutoff);
    if (kept.length === this.items.length) return;
    this.items = kept;
    this.save();
  }

  private save(): void {
    saveJson(EVENTS_KEY, this.items);
    saveJson(REMOVED_KEY, [...this.removedUids]);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private commit(): void {
    this.save();
    this.notify();
  }
}
