import { ENABLED_WIDGETS, SOURCES, SOURCE_IDS } from "./config";
import type { Widget } from "./types";
import { findEl } from "./lib/dom";
import { EventStore } from "./lib/eventStore";
import { Backup } from "./modules/backup";
import { Clock } from "./modules/clock";
import { EventDialog } from "./modules/eventDialog";
import { EventPanel } from "./modules/eventPanel";
import { PowerSaver } from "./modules/powerSaver";
import { Rain } from "./modules/rain";
import { Search } from "./modules/search";
import { Weather } from "./modules/weather";

// each module mounts into an element from index.html, a missing element skips it
function boot(): void {
  const store = new EventStore();
  const widgets: Widget[] = [];

  const clockMount = findEl("clock");
  if (ENABLED_WIDGETS.clock && clockMount) widgets.push(new Clock(clockMount));

  const weatherMount = findEl("weather");
  if (ENABLED_WIDGETS.weather && weatherMount) widgets.push(new Weather(weatherMount));

  const searchMount = findEl("search");
  if (ENABLED_WIDGETS.search && searchMount) widgets.push(new Search(searchMount));

  const rainCanvas = findEl<HTMLCanvasElement>("rain");
  if (ENABLED_WIDGETS.rain && rainCanvas) widgets.push(new Rain(rainCanvas));

  const dialog = new EventDialog(store);
  for (const source of SOURCE_IDS) {
    const mount = findEl(SOURCES[source].mountId);
    if (ENABLED_WIDGETS[source] && mount) widgets.push(new EventPanel(mount, source, store, dialog));
  }

  const backupMount = findEl("backup");
  if (ENABLED_WIDGETS.backup && backupMount) new Backup(backupMount, store);

  // saver state goes to every widget before anything starts
  const saverMount = findEl("saver");
  if (saverMount) {
    const saver = new PowerSaver(saverMount);
    const applySaver = (on: boolean): void => widgets.forEach((w) => w.setSaver?.(on));
    applySaver(saver.isOn());
    saver.onChange(applySaver);
  }

  widgets.forEach((w) => w.start());

  // nothing needs to run while the tab is hidden
  document.addEventListener("visibilitychange", () => {
    for (const w of widgets) {
      if (document.hidden) w.stop();
      else w.start();
    }
  });
}

boot();
