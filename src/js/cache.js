import { getSettings } from "./settings.js";

const CACHE_VERSION = "v2";

class CacheManager {
  constructor(storageKey) {
    this.storageKey = `${storageKey}_${CACHE_VERSION}`;
    this.cache = {};
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch (e) {
      this.cache = {};
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
    } catch (e) {
    }
  }

  normalizeKey(lat, lng) {
    return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  }

  get(lat, lng) {
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

  set(lat, lng, data) {
    const key = this.normalizeKey(lat, lng);
    this.cache[key] = { data, ts: Date.now() };
    this.save();
  }

  clear() {
    this.cache = {};
    localStorage.removeItem(this.storageKey);
  }
}

export const weatherCache = new CacheManager("wwm_weather");
export const aqiCache = new CacheManager("wwm_aqi_cache");
