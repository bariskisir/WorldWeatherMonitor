import { getSettings } from "./settings.js";

const CACHE_VERSION = "v2";

interface CacheEntry {
  data: unknown;
  ts: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

class CacheManager {
  private storageKey: string;
  private cache: CacheStore;

  constructor(storageKey: string) {
    this.storageKey = `${storageKey}_${CACHE_VERSION}`;
    this.cache = {};
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch (e) {
      this.cache = {};
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
    } catch (e) {
    }
  }

  private normalizeKey(lat: number, lng: number): string {
    return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  }

  get(lat: number, lng: number): unknown | null {
    const key = this.normalizeKey(lat, lng);
    const entry = this.cache[key];
    if (!entry) return null;

    const cacheDuration = getSettings().cacheDuration || 5;
    const cacheMs = cacheDuration * 60 * 1000;

    if (Date.now() - entry.ts > cacheMs) {
      delete this.cache[key];
      this.save();
      return null;
    }
    return entry.data;
  }

  set(lat: number, lng: number, data: unknown): void {
    const key = this.normalizeKey(lat, lng);
    this.cache[key] = { data, ts: Date.now() };
    this.save();
  }

  clear(): void {
    this.cache = {};
    localStorage.removeItem(this.storageKey);
  }
}

export const weatherCache = new CacheManager("wwm_weather");
export const aqiCache = new CacheManager("wwm_aqi_cache");
