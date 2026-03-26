/** This file provides a small typed cache manager backed by localStorage. */
import type { AppSettings } from "../app/types";
import { readStorage, writeStorage } from "../app/storage";

interface CacheEntry<T> {
  data: T;
  ts: number;
}

type CacheStore<T> = Record<string, CacheEntry<T>>;

/** This class persists keyed API responses using a configurable TTL. */
export class CacheManager<T> {
  private readonly storageKey: string;

  /** This constructor creates a cache manager for the provided storage key. */
  public constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  /** This method returns a cache entry when it is still valid. */
  public get(lat: number, lng: number, settings: AppSettings): T | null {
    const cacheStore = readStorage<CacheStore<T>>(this.storageKey) ?? {};
    const entry = cacheStore[this.normalizeKey(lat, lng)];

    if (!entry) {
      return null;
    }

    const cacheMs = settings.cacheDuration * 60 * 1000;

    if (Date.now() - entry.ts > cacheMs) {
      delete cacheStore[this.normalizeKey(lat, lng)];
      writeStorage(this.storageKey, cacheStore);
      return null;
    }

    return entry.data;
  }

  /** This method saves a cache entry for the provided coordinates. */
  public set(lat: number, lng: number, data: T): void {
    const cacheStore = readStorage<CacheStore<T>>(this.storageKey) ?? {};
    cacheStore[this.normalizeKey(lat, lng)] = {
      data,
      ts: Date.now(),
    };
    writeStorage(this.storageKey, cacheStore);
  }
  /** This method normalizes latitude and longitude into a stable cache key. */
  private normalizeKey(lat: number, lng: number): string {
    return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  }
}
