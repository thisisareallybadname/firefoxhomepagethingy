import type { EventItem, SourceId, SourceInfo, Widget } from "../types";
import { CLOCK_USE_24H, IMPORT_HORIZON_DAYS, SHOW_DONE_FOR_DAYS, SOURCES } from "../config";
import { addDaysToKey, formatTime, nowTime, relativeDay, todayKey } from "../lib/dates";
import { makeButton, makeEl } from "../lib/dom";
import type { EventStore } from "../lib/eventStore";
import { parseIcs } from "../lib/ics";
import { loadJson, saveJson } from "../lib/storage";
import type { EventDialog } from "./eventDialog";

const OPEN_KEY = "panelsOpen";
const REFRESH_MS = 5 * 60000;
const STATUS_MS = 6000;

// one expandable list, used for both canvas and calendar
export class EventPanel implements Widget {
  name: string;
  private source: SourceId;
  private info: SourceInfo;
  private store: EventStore;
  private dialog: EventDialog;
  private details = makeEl("details", "panel");
  private hintEl = makeEl("span", "panelHint");
  private listEl = makeEl("ul", "rows");
  private statusEl = makeEl("span", "status");
  private statusTimer = 0;
  private timerId = 0;

  constructor(mount: HTMLElement, source: SourceId, store: EventStore, dialog: EventDialog) {
    this.name = source;
    this.source = source;
    this.info = SOURCES[source];
    this.store = store;
    this.dialog = dialog;

    const summary = makeEl("summary");
    summary.append(makeEl("span", "panelTitle", this.info.label), this.hintEl);

    const addBtn = makeButton("+ add");
    addBtn.addEventListener("click", () => this.dialog.open(this.source));

    const fileInput = makeEl("input");
    fileInput.type = "file";
    fileInput.accept = ".ics,text/calendar";
    fileInput.hidden = true;
    fileInput.addEventListener("change", () => void this.importFile(fileInput));
    const importBtn = makeButton("import .ics");
    importBtn.addEventListener("click", () => fileInput.click());

    const footer = makeEl("div", "panelFooter");
    footer.append(addBtn, importBtn, fileInput, this.statusEl);

    this.details.append(summary, this.listEl, footer);
    mount.append(this.details);

    const saved = loadJson<Record<string, boolean>>(OPEN_KEY, {});
    this.details.open = saved[source] ?? true;
    this.details.addEventListener("toggle", () => {
      const state = loadJson<Record<string, boolean>>(OPEN_KEY, {});
      state[this.source] = this.details.open;
      saveJson(OPEN_KEY, state);
    });

    this.store.onChange(() => this.render());
  }

  start(): void {
    this.render();
    clearInterval(this.timerId);
    // keeps overdue marks and day labels from going stale
    this.timerId = window.setInterval(() => this.render(), REFRESH_MS);
  }

  stop(): void {
    clearInterval(this.timerId);
  }

  // unfinished past items stay as overdue, finished ones linger briefly so a stray click is easy to undo
  private isVisible(item: EventItem, today: string): boolean {
    if (item.date >= today) return true;
    if (!this.info.hasDone) return false;
    return !item.done || item.date >= addDaysToKey(today, -SHOW_DONE_FOR_DAYS);
  }

  private isOverdue(item: EventItem, today: string, now: string): boolean {
    if (!this.info.hasDone || item.done) return false;
    if (item.date < today) return true;
    return item.date === today && item.time !== "" && item.time < now;
  }

  private render(): void {
    const today = todayKey();
    const now = nowTime();
    const visible = this.store.getBySource(this.source).filter((it) => this.isVisible(it, today));
    // finished items sink to the bottom, the sort keeps date order otherwise
    visible.sort((a, b) => Number(a.done) - Number(b.done));

    if (visible.length === 0) {
      this.listEl.replaceChildren(makeEl("li", "empty", "nothing here yet"));
    } else {
      this.listEl.replaceChildren(...visible.map((it) => this.buildRow(it, today, now)));
    }
    this.renderHint(visible, today, now);
  }

  private renderHint(visible: EventItem[], today: string, now: string): void {
    const open = visible.filter((it) => !it.done);
    const overdue = open.filter((it) => this.isOverdue(it, today, now));
    const next = open.find((it) => !this.isOverdue(it, today, now));
    const parts = [open.length === 0 ? "all clear" : `${open.length} ${this.info.hasDone ? "open" : "coming up"}`];
    if (overdue.length > 0) parts.push(`${overdue.length} overdue`);
    if (next) parts.push(`next ${relativeDay(next.date)}`);
    this.hintEl.textContent = parts.join(" · ");
    this.hintEl.classList.toggle("alert", overdue.length > 0);
  }

  private buildRow(item: EventItem, today: string, now: string): HTMLLIElement {
    const row = makeEl("li", "row");
    row.classList.toggle("done", item.done);
    row.classList.toggle("overdue", this.isOverdue(item, today, now));

    if (this.info.hasDone) {
      row.classList.add("hasCheck");
      const check = makeEl("input", "check");
      check.type = "checkbox";
      check.checked = item.done;
      check.setAttribute("aria-label", "mark done");
      check.addEventListener("change", () => this.store.toggleDone(item.id));
      row.append(check);
    }

    const when = makeEl("span", "rowWhen", relativeDay(item.date));
    const timeText = formatTime(item.time, CLOCK_USE_24H);
    if (timeText) when.append(makeEl("small", "", timeText));

    const what = makeEl("span", "rowWhat", item.title);
    if (item.note) what.append(makeEl("small", "", item.note));

    const editBtn = makeButton("edit", "textBtn rowEdit");
    editBtn.addEventListener("click", () => this.dialog.open(this.source, item));

    row.append(when, what, editBtn);
    return row;
  }

  private async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const events = parseIcs(await file.text(), IMPORT_HORIZON_DAYS);
      if (events.length === 0) {
        this.say("no upcoming events in that file");
      } else {
        const result = this.store.mergeImported(this.source, events);
        this.say(`added ${result.added}, updated ${result.updated}`);
      }
    } catch {
      this.say("could not read that file");
    }
    // clearing lets the same file be picked again later
    input.value = "";
  }

  private say(text: string): void {
    this.statusEl.textContent = text;
    clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      this.statusEl.textContent = "";
    }, STATUS_MS);
  }
}
