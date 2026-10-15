export type SourceId = "canvas" | "calendar";

export interface EventItem {
  id: string;
  source: SourceId;
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm in 24h, empty for all day
  note: string; // course for canvas, place for calendar
  done: boolean;
  uid: string; // id from an imported .ics, empty for manual items
  edited: boolean; // true once changed by hand so imports leave it alone
}

export interface SourceInfo {
  label: string;
  noteLabel: string;
  hasDone: boolean;
  defaultTime: string;
  mountId: string;
}

// every module on the page follows this shape
export interface Widget {
  name: string;
  start(): void;
  stop(): void;
  setSaver?(on: boolean): void;
}
