import type { EventItem, SourceId } from "../types";
import { SOURCES } from "../config";
import { todayKey } from "../lib/dates";
import { makeButton, makeEl } from "../lib/dom";
import type { EventStore } from "../lib/eventStore";

// label wrapping a caption and an input
function makeField(caption: string, input: HTMLInputElement): { label: HTMLLabelElement; text: HTMLSpanElement } {
  const label = makeEl("label");
  const text = makeEl("span", "", caption);
  label.append(text, input);
  return { label, text };
}

function makeInput(type: string, name: string): HTMLInputElement {
  const input = makeEl("input");
  input.type = type;
  input.name = name;
  return input;
}

// one shared popup used for adding and editing in every panel
export class EventDialog {
  private store: EventStore;
  private dialog = makeEl("dialog", "editDialog");
  private heading = makeEl("h2");
  private titleInput = makeInput("text", "title");
  private dateInput = makeInput("date", "date");
  private timeInput = makeInput("time", "time");
  private noteInput = makeInput("text", "note");
  private deleteBtn = makeButton("delete", "textBtn danger");
  private noteCaption: HTMLSpanElement;
  private source: SourceId = "canvas";
  private editingId: string | null = null;

  constructor(store: EventStore) {
    this.store = store;
    this.titleInput.required = true;
    this.titleInput.maxLength = 120;
    this.dateInput.required = true;
    this.noteInput.maxLength = 80;

    const title = makeField("title", this.titleInput);
    const date = makeField("date", this.dateInput);
    const time = makeField("time", this.timeInput);
    const note = makeField("note", this.noteInput);
    this.noteCaption = note.text;

    const dateRow = makeEl("div", "fieldRow");
    dateRow.append(date.label, time.label);

    const cancelBtn = makeButton("cancel");
    const saveBtn = makeButton("save", "textBtn primary");
    saveBtn.type = "submit";
    const actions = makeEl("div", "dialogActions");
    actions.append(this.deleteBtn, makeEl("span", "spacer"), cancelBtn, saveBtn);

    const form = makeEl("form");
    form.append(this.heading, title.label, dateRow, note.label, actions);
    this.dialog.append(form);
    document.body.append(this.dialog);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.save();
    });
    cancelBtn.addEventListener("click", () => this.dialog.close());
    this.deleteBtn.addEventListener("click", () => this.remove());
    // a click on the dim backdrop lands on the dialog itself
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });
  }

  // pass an item to edit it, leave it out to add a new one
  open(source: SourceId, item?: EventItem): void {
    const info = SOURCES[source];
    this.source = source;
    this.editingId = item ? item.id : null;
    this.heading.textContent = `${item ? "edit" : "new"} ${info.label} item`;
    this.noteCaption.textContent = info.noteLabel;
    this.titleInput.value = item ? item.title : "";
    this.dateInput.value = item ? item.date : todayKey();
    this.timeInput.value = item ? item.time : info.defaultTime;
    this.noteInput.value = item ? item.note : "";
    this.deleteBtn.hidden = !item;
    this.dialog.showModal();
    this.titleInput.focus();
  }

  private save(): void {
    const draft = {
      title: this.titleInput.value.trim(),
      date: this.dateInput.value,
      time: this.timeInput.value,
      note: this.noteInput.value.trim(),
    };
    if (!draft.title || !draft.date) return;
    if (this.editingId) this.store.update(this.editingId, draft);
    else this.store.add(this.source, draft);
    this.dialog.close();
  }

  private remove(): void {
    if (this.editingId) this.store.remove(this.editingId);
    this.dialog.close();
  }
}
