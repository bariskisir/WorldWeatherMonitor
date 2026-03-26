/** This file contains typed API clients for weather, AQI, and search requests. */
import { API, SEARCH_CONFIG, STORAGE_KEYS, WEATHER_PARAMS } from "../app/constants";
import type {
  AirQualitySnapshot,
  AppSettings,
  SearchLocationResult,
  WeatherForecast,
} from "../app/types";
import { CacheManager } from "./cacheManager";

const weatherCache = new CacheManager<WeatherForecast>(STORAGE_KEYS.weatherCache);
const airQualityCache = new CacheManager<AirQualitySnapshot>(STORAGE_KEYS.aqiCache);

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

  const url =
    `${API.FORECAST}?latitude=${lat}&longitude=${lng}` +
    `&current=${WEATHER_PARAMS.CURRENT}` +
    `&hourly=${WEATHER_PARAMS.HOURLY}` +
    `&daily=${WEATHER_PARAMS.DAILY}` +
    "&timezone=auto&forecast_days=7";

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

  const url =
    `${API.AIR_QUALITY}?latitude=${lat}&longitude=${lng}` +
    `&current=${WEATHER_PARAMS.AIR_QUALITY}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Air Quality API error: ${response.status}`);
  }

  const data = (await response.json()) as AirQualitySnapshot;
  airQualityCache.set(lat, lng, data);
  return data;
}

/** This function searches geocoding results for the query string. */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  if (query.trim().length < SEARCH_CONFIG.minLength) {
    return [];
  }

  const url =
    `${API.GEOCODING}?name=${encodeURIComponent(query)}` +
    `&count=${SEARCH_CONFIG.resultCount}&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status}`);
  }

  const data = (await response.json()) as { results?: SearchLocationResult[] };
  return data.results ?? [];
}
