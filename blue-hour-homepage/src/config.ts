import type { SourceId, SourceInfo } from "./types";

// set one to false to turn a module off
export const ENABLED_WIDGETS = {
  clock: true,
  weather: true,
  rain: true,
  canvas: true,
  calendar: true,
  search: true,
  backup: true,
};

export const CLOCK_USE_24H = false;
export const CLOCK_SHOW_SECONDS = false;

// change these to your own spot, any map site shows coordinates
export const WEATHER_LAT = 47.6062;
export const WEATHER_LON = -122.3321;
export const WEATHER_PLACE = "seattle";
export const WEATHER_UNIT: "fahrenheit" | "celsius" = "fahrenheit";
export const WEATHER_REFRESH_MINUTES = 30;

export const RAIN_MAX_DROPS = 140;
export const RAIN_FPS = 30;
export const RAIN_SLANT = 0.18; // sideways drift per pixel fallen

// engines to pick from, add your own with its search page address and query name
export const SEARCH_ENGINES = {
  duckduckgo: { label: "duckduckgo", url: "https://duckduckgo.com/", param: "q" },
  google: { label: "google", url: "https://www.google.com/search", param: "q" },
  bing: { label: "bing", url: "https://www.bing.com/search", param: "q" },
};

export const SEARCH_ENGINE: keyof typeof SEARCH_ENGINES = "duckduckgo";

// top is above the clock, middle sits between the clock and the lists, bottom is under the lists
export const SEARCH_POSITION: "top" | "middle" | "bottom" = "middle";
export const SEARCH_ALIGN: "left" | "center" | "right" = "center";

// items older than this get cleaned out of storage
export const PURGE_AFTER_DAYS = 30;

// finished canvas items stay listed this many days past their date
export const SHOW_DONE_FOR_DAYS = 2;

// how far ahead an .ics import looks
export const IMPORT_HORIZON_DAYS = 90;

export const SOURCE_IDS: SourceId[] = ["canvas", "calendar"];

export const SOURCES: Record<SourceId, SourceInfo> = {
  canvas: {
    label: "canvas",
    noteLabel: "course",
    hasDone: true,
    defaultTime: "23:59",
    mountId: "panelCanvas",
  },
  calendar: {
    label: "calendar",
    noteLabel: "place",
    hasDone: false,
    defaultTime: "",
    mountId: "panelCalendar",
  },
};
