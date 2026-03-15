export const API = {
  FORECAST: "https://api.open-meteo.com/v1/forecast",
  AIR_QUALITY: "https://air-quality-api.open-meteo.com/v1/air-quality",
  GEOCODING: "https://geocoding-api.open-meteo.com/v1/search",
};

export const WEATHER_PARAMS = {
  CURRENT:
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,cloud_cover,is_day",
  HOURLY:
    "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility,uv_index,relative_humidity_2m,is_day",
  DAILY:
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
  AIR_QUALITY: "pm2_5,pm10,us_aqi,european_aqi",
};

export const MAP = {
  CENTER: [30, 10] as [number, number],
  ZOOM: 3,
  MIN_ZOOM: 2,
  MAX_ZOOM: 18,
  TILE_URL: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  TILE_ATTRIBUTION: "&copy; Google Maps",
};

export const BATCH_SIZE = 3;
export const BATCH_DELAY = 500;
export const MAX_CONCURRENT_BATCHES = 1;
export const CACHE_TTL = 5 * 60 * 1000;

export const MAX_MARKERS = 20;
export const INITIAL_CAPITALS = 50;
export const FORECAST_DAYS = 7;

export const SEARCH_DEBOUNCE = 300;
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_RESULT_COUNT = 8;
