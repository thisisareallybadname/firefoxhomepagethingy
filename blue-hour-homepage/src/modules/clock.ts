import type { Widget } from "../types";
import { CLOCK_SHOW_SECONDS, CLOCK_USE_24H } from "../config";
import { pad2 } from "../lib/dates";
import { makeEl } from "../lib/dom";

// greeting follows the hour
function greetingFor(hour: number): string {
  if (hour < 5) return "still up?";
  if (hour < 12) return "good morning";
  if (hour < 17) return "good afternoon";
  if (hour < 21) return "good evening";
  return "good night";
}

export class Clock implements Widget {
  name = "clock";
  private running = false;
  private saver = false;
  private timerId = 0;
  private lastText = "";
  private greetingEl = makeEl("p", "greeting");
  private timeEl = makeEl("p", "time");
  private dateEl = makeEl("p", "date");

  constructor(mount: HTMLElement) {
    mount.append(this.greetingEl, this.timeEl, this.dateEl);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timerId);
  }

  // power saver hides the seconds so the clock wakes once a minute
  setSaver(on: boolean): void {
    this.saver = on;
    if (!this.running) return;
    this.stop();
    this.start();
  }

  private tick(): void {
    const now = new Date();
    this.render(now);
    const msIntoMinute = now.getSeconds() * 1000 + now.getMilliseconds();
    const wait = this.showSeconds() ? 1000 - now.getMilliseconds() : 60000 - msIntoMinute;
    this.timerId = window.setTimeout(() => this.tick(), wait + 20);
  }

  private showSeconds(): boolean {
    return CLOCK_SHOW_SECONDS && !this.saver;
  }

  private render(now: Date): void {
    const hours = CLOCK_USE_24H ? pad2(now.getHours()) : String(now.getHours() % 12 || 12);
    const seconds = this.showSeconds() ? `:${pad2(now.getSeconds())}` : "";
    const suffix = CLOCK_USE_24H ? "" : now.getHours() < 12 ? "am" : "pm";
    const text = `${hours}:${pad2(now.getMinutes())}${seconds}${suffix}`;
    if (text === this.lastText) return;
    this.lastText = text;

    this.timeEl.replaceChildren(`${hours}:${pad2(now.getMinutes())}${seconds}`);
    if (suffix) this.timeEl.append(makeEl("span", "ampm", suffix));
    this.greetingEl.textContent = greetingFor(now.getHours());
    this.dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
}
