import { todayKey } from "../lib/dates";
import { downloadText, makeButton, makeEl } from "../lib/dom";
import type { EventStore } from "../lib/eventStore";

const STATUS_MS = 6000;

// export and restore buttons, browser storage can get wiped so keep a copy
export class Backup {
  private store: EventStore;
  private statusEl = makeEl("span", "status");
  private statusTimer = 0;

  constructor(mount: HTMLElement, store: EventStore) {
    this.store = store;

    const exportBtn = makeButton("export");
    exportBtn.addEventListener("click", () => this.exportFile());

    const fileInput = makeEl("input");
    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.hidden = true;
    fileInput.addEventListener("change", () => void this.restoreFile(fileInput));
    const restoreBtn = makeButton("restore");
    restoreBtn.addEventListener("click", () => fileInput.click());

    mount.append(exportBtn, restoreBtn, fileInput, this.statusEl);
  }

  private exportFile(): void {
    const json = JSON.stringify(this.store.exportData(), null, 2);
    downloadText(`blue-hour-backup-${todayKey()}.json`, json, "application/json");
  }

  private async restoreFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const count = this.store.restore(JSON.parse(await file.text()));
      this.say(count < 0 ? "that is not a backup file" : `restored ${count} items`);
    } catch {
      this.say("could not read that file");
    }
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
