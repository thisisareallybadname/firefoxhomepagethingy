import type { Widget } from "../types";
import { SEARCH_ALIGN, SEARCH_ENGINE, SEARCH_ENGINES, SEARCH_POSITION } from "../config";
import { makeEl } from "../lib/dom";

// plain search form that hands the query to the chosen engine
export class Search implements Widget {
  name = "search";
  private input = makeEl("input", "searchInput");

  constructor(mount: HTMLElement) {
    const engine = SEARCH_ENGINES[SEARCH_ENGINE];
    const form = makeEl("form", "searchForm");
    form.action = engine.url;
    form.method = "get";
    form.setAttribute("role", "search");

    this.input.type = "search";
    this.input.name = engine.param;
    this.input.placeholder = `search ${engine.label}`;
    this.input.autocomplete = "off";
    this.input.setAttribute("aria-label", `search ${engine.label}`);

    form.append(this.input);
    // css reads these two attributes to place the bar
    mount.dataset.position = SEARCH_POSITION;
    mount.dataset.align = SEARCH_ALIGN;
    mount.append(form);
  }

  start(): void {
    document.addEventListener("keydown", this.onKeyDown);
  }

  stop(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  // pressing / jumps to the bar unless you are already typing somewhere
  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, dialog")) return;
    event.preventDefault();
    this.input.focus();
  };
}
