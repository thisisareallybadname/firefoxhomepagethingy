import type { Widget } from "../types";
import {
  CLOCK_USE_24H,
  WEATHER_LAT,
  WEATHER_LON,
  WEATHER_PLACE,
  WEATHER_REFRESH_MINUTES,
  WEATHER_UNIT,
} from "../config";
import { formatTime, pad2 } from "../lib/dates";
import { makeEl } from "../lib/dom";
import { loadJson, saveJson } from "../lib/storage";

const CACHE_KEY = "weather";
const REFRESH_MS = WEATHER_REFRESH_MINUTES * 60000;
const SPOT_KEY = `${WEATHER_LAT},${WEATHER_LON},${WEATHER_UNIT}`;

// wmo codes from open-meteo mapped to short words
const WEATHER_TEXT: Record<number, string> = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "freezing fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "light showers",
  81: "showers",
  82: "heavy showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with hail",
};

interface WeatherData {
  spot: string; // location and unit this was fetched for
  fetchedAt: number;
  temp: number;
  feels: number;
  high: number;
  low: number;
  rain: number;
  code: number;
}

interface ApiResponse {
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: Array<number | null>;
  };
}

function buildUrl(): string {
  const params = new URLSearchParams({
    latitude: String(WEATHER_LAT),
    longitude: String(WEATHER_LON),
    current: "temperature_2m,apparent_temperature,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: WEATHER_UNIT,
    timezone: "auto",
    forecast_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export class Weather implements Widget {
  name = "weather";
  private running = false;
  private saver = false;
  private hasShown = false;
  private intervalId = 0;
  private tempEl = makeEl("p", "temp");
  private descEl = makeEl("p", "desc", "loading weather");
  private detailEl = makeEl("p", "detail");
  private placeEl = makeEl("p", "place");

  constructor(mount: HTMLElement) {
    mount.append(this.tempEl, this.descEl, this.detailEl, this.placeEl);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const cached = this.readCache();
    if (cached) this.render(cached);
    const stale = !cached || Date.now() - cached.fetchedAt > REFRESH_MS;
    // saver only goes online when there is nothing cached to show
    if (stale && (!this.saver || !cached)) void this.refresh();
    if (!this.saver) this.intervalId = window.setInterval(() => void this.refresh(), REFRESH_MS);
  }

  stop(): void {
    this.running = false;
    clearInterval(this.intervalId);
  }

  setSaver(on: boolean): void {
    this.saver = on;
    if (!this.running) return;
    this.stop();
    this.start();
  }

  private readCache(): WeatherData | null {
    const data = loadJson<WeatherData | null>(CACHE_KEY, null);
    return data && data.spot === SPOT_KEY ? data : null;
  }

  private async refresh(): Promise<void> {
    try {
      const response = await fetch(buildUrl());
      if (!response.ok) throw new Error(`weather request failed with ${response.status}`);
      const body = (await response.json()) as ApiResponse;
      const data: WeatherData = {
        spot: SPOT_KEY,
        fetchedAt: Date.now(),
        temp: Math.round(body.current.temperature_2m),
        feels: Math.round(body.current.apparent_temperature),
        high: Math.round(body.daily.temperature_2m_max[0]),
        low: Math.round(body.daily.temperature_2m_min[0]),
        rain: body.daily.precipitation_probability_max[0] ?? 0,
        code: body.current.weather_code,
      };
      saveJson(CACHE_KEY, data);
      this.render(data);
    } catch {
      // old numbers stay on screen, only say offline when there is nothing to show
      if (!this.hasShown) this.descEl.textContent = "weather offline";
    }
  }

  private render(data: WeatherData): void {
    this.hasShown = true;
    const updated = new Date(data.fetchedAt);
    const updatedTime = formatTime(`${pad2(updated.getHours())}:${pad2(updated.getMinutes())}`, CLOCK_USE_24H);
    this.tempEl.textContent = `${data.temp}°`;
    this.descEl.textContent = WEATHER_TEXT[data.code] ?? "unsettled";
    this.detailEl.textContent = `feels ${data.feels}° · hi ${data.high}° · lo ${data.low}° · rain ${data.rain}%`;
    this.placeEl.textContent = `${WEATHER_PLACE} · updated ${updatedTime}`;
  }
}
