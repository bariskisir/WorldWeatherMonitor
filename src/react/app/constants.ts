/** This file stores static configuration shared across the application. */
export const API = {
  FORECAST: "https://api.open-meteo.com/v1/forecast",
  AIR_QUALITY: "https://air-quality-api.open-meteo.com/v1/air-quality",
  MARINE: "https://marine-api.open-meteo.com/v1/marine",
  GEOCODING: "https://geocoding-api.open-meteo.com/v1/search",
} as const;

export const WEATHER_PARAMS = {
  CURRENT:
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,cloud_cover,visibility,uv_index,is_day",
  HOURLY:
    "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility,uv_index,relative_humidity_2m,is_day",
  DAILY:
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
  AIR_QUALITY: "pm2_5,pm10,us_aqi,european_aqi",
  MARINE_HOURLY: "sea_surface_temperature",
} as const;

export const MAP_CONFIG = {
  center: [30, 10] as [number, number],
  zoom: 3,
  minZoom: 2,
  maxZoom: 18,
  tileUrl: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  tileAttribution: "&copy; Google Maps",
} as const;

export const SEARCH_CONFIG = {
  debounceMs: 300,
  minLength: 2,
  resultCount: 8,
} as const;

export const SETTINGS_LIMITS = {
  boxCount: {
    min: 5,
    max: 1000,
  },
  cacheDuration: {
    min: 5,
    max: 60,
  },
} as const;

export const SETTINGS_OPTIONS = {
  boxCount: [5, 15, 30, 50, 100, 250, 1000],
  cacheDuration: [5, 15, 30, 60],
} as const;

export const UI_CONFIG = {
  markerIconSize: 20,
  markerIconAnchor: 10,
  markerZIndexOffset: 1000,
  mapTileMaxZoom: 20,
  mapFocusZoom: 10,
  mapFocusDurationSeconds: 1.5,
  toastDurationMs: 5000,
  popupHourlyItemCount: 12,
  popupWarmThresholdC: 20,
} as const;

export const STORAGE_KEYS = {
  settings: "wwm_settings",
  mapState: "wwm_map_state",
  weatherCache: "wwm_weather_cache",
  aqiCache: "wwm_aqi_cache",
  marineCache: "wwm_marine_cache",
} as const;

/** This table maps zoom thresholds to the minimum marker priority that may be shown. */
const ZOOM_PRIORITY_THRESHOLDS: ReadonlyArray<{ maxZoom: number; priority: number }> = [
  { maxZoom: 4, priority: 4 },
  { maxZoom: 6, priority: 3 },
  { maxZoom: 10, priority: 2 },
];

/** This function returns the minimum marker priority that may be shown at a zoom level. */
export function getMinimumPriorityForZoom(zoom: number): number {
  for (const threshold of ZOOM_PRIORITY_THRESHOLDS) {
    if (zoom < threshold.maxZoom) {
      return threshold.priority;
    }
  }

  return 1;
}
