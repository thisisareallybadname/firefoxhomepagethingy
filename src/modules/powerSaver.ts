import { makeButton } from "../lib/dom";
import { loadJson, saveJson } from "../lib/storage";

const SAVER_KEY = "powerSaver";

const LEAF_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path class="leaf" d="M5 19C5 10 11 5 20 5C20 14 15 19 5 19Z"/>
  <path d="M5 19L14 10"/>
</svg>`;

// corner button that turns the heavy visuals off
export class PowerSaver {
  private on: boolean;
  private listeners: Array<(on: boolean) => void> = [];
  private button = makeButton("", "iconBtn saverBtn");

  constructor(mount: HTMLElement) {
    // first visit follows the system reduced motion setting
    const stored = loadJson<boolean | null>(SAVER_KEY, null);
    this.on = stored ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.button.innerHTML = LEAF_ICON;
    this.button.addEventListener("click", () => this.toggle());
    mount.append(this.button);
    this.apply();
  }

  isOn(): boolean {
    return this.on;
  }

  onChange(listener: (on: boolean) => void): void {
    this.listeners.push(listener);
  }

  private toggle(): void {
    this.on = !this.on;
    saveJson(SAVER_KEY, this.on);
    this.apply();
    for (const listener of this.listeners) listener(this.on);
  }

  // css reads the data attribute on the html tag
  private apply(): void {
    document.documentElement.dataset.power = this.on ? "saver" : "normal";
    this.button.setAttribute("aria-pressed", String(this.on));
    this.button.title = this.on ? "power saver on" : "power saver off";
    this.button.setAttribute("aria-label", this.button.title);
  }
}
