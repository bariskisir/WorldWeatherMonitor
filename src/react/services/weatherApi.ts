/** This file contains typed API clients for weather, AQI, and search requests. */
import { API, SEARCH_CONFIG, STORAGE_KEYS, WEATHER_PARAMS } from "../app/constants";
import type {
  AirQualitySnapshot,
  AppSettings,
  MarineSnapshot,
  SearchLocationResult,
  WeatherForecast,
} from "../app/types";
import { CacheManager } from "./cacheManager";

const weatherCache = new CacheManager<WeatherForecast>(STORAGE_KEYS.weatherCache);
const airQualityCache = new CacheManager<AirQualitySnapshot>(STORAGE_KEYS.aqiCache);
const marineCache = new CacheManager<MarineSnapshot>(STORAGE_KEYS.marineCache);

/** This function builds a full URL from a base and typed params. */
function buildUrl(base: string, params: Record<string, string | number>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  return `${base}?${searchParams.toString()}`;
}

/** This function fetches forecast data and respects the current cache duration setting. */
export async function fetchWeatherData(
  lat: number,
  lng: number,
  settings: AppSettings,
  signal?: AbortSignal,
): Promise<WeatherForecast> {
  const cached = weatherCache.get(lat, lng, settings);

  if (cached) {
    return cached;
  }

  const url = buildUrl(API.FORECAST, {
    latitude: lat,
    longitude: lng,
    current: WEATHER_PARAMS.CURRENT,
    hourly: WEATHER_PARAMS.HOURLY,
    daily: WEATHER_PARAMS.DAILY,
    timezone: "auto",
    forecast_days: 14,
  });

  const response = await fetch(url, { signal });

  if (!response.ok) {
    if (response.status === 429) {
      const errorData = (await response.json().catch(() => ({}))) as { reason?: string };
      throw new Error(`429: ${errorData.reason ?? "Rate limit exceeded"}`);
    }

    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = (await response.json()) as WeatherForecast;
  weatherCache.set(lat, lng, data);
  return data;
}

/** This function fetches air quality data and respects the current cache duration setting. */
export async function fetchAirQuality(
  lat: number,
  lng: number,
  settings: AppSettings,
  signal?: AbortSignal,
): Promise<AirQualitySnapshot> {
  const cached = airQualityCache.get(lat, lng, settings);

  if (cached) {
    return cached;
  }

  const url = buildUrl(API.AIR_QUALITY, {
    latitude: lat,
    longitude: lng,
    current: WEATHER_PARAMS.AIR_QUALITY,
  });

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Air Quality API error: ${response.status}`);
  }

  const data = (await response.json()) as AirQualitySnapshot;
  airQualityCache.set(lat, lng, data);
  return data;
}

/** This function fetches marine data and respects the current cache duration setting. */
export async function fetchMarineData(
  lat: number,
  lng: number,
  settings: AppSettings,
  signal?: AbortSignal,
): Promise<MarineSnapshot> {
  const cached = marineCache.get(lat, lng, settings);

  if (cached) {
    return cached;
  }

  const url = buildUrl(API.MARINE, {
    latitude: lat,
    longitude: lng,
    hourly: WEATHER_PARAMS.MARINE_HOURLY,
    timezone: "auto",
    forecast_days: 1,
  });

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Marine API error: ${response.status}`);
  }

  const data = (await response.json()) as MarineSnapshot;
  marineCache.set(lat, lng, data);
  return data;
}

/** This function searches geocoding results for the query string. */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  if (query.trim().length < SEARCH_CONFIG.minLength) {
    return [];
  }

  const url = buildUrl(API.GEOCODING, {
    name: query,
    count: SEARCH_CONFIG.resultCount,
    language: "en",
    format: "json",
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status}`);
  }

  const data = (await response.json()) as { results?: SearchLocationResult[] };
  return data.results ?? [];
}
