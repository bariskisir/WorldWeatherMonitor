/** This file defines the shared TypeScript contracts used across the application. */
export interface AppSettings {
  tempUnit: "C" | "F";
  distanceSpeedUnit: "metric" | "imperial";
  boxCount: number;
  cacheDuration: number;
  animations: boolean;
  boxSize: "small" | "medium" | "large";
}

export interface MapViewportState {
  center: [number, number];
  zoom: number;
}

export interface LocationEntry {
  name: string;
  lat: number;
  lng: number;
  country: string;
  isCity?: boolean;
  isCapital?: boolean;
  isDistrict?: boolean;
  priority: number;
}

export interface SearchLocationResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export interface WeatherForecast {
  current: {
    weather_code: number;
    temperature_2m: number;
    is_day: boolean;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    surface_pressure: number;
    cloud_cover: number;
    visibility?: number;
    uv_index?: number;
    precipitation?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day?: boolean[];
    precipitation_probability?: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    wind_speed_10m_max?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
  };
}

export interface AirQualitySnapshot {
  current: {
    pm2_5?: number;
    pm10?: number;
    us_aqi?: number;
    european_aqi?: number;
  };
}

export interface MarineSnapshot {
  hourly?: {
    time: string[];
    sea_surface_temperature?: number[];
  };
}

export interface WeatherInfo {
  description: string;
  icon: string;
  iconNight: string;
  group: string;
}

export interface ReturnedWeatherInfo {
  description: string;
  icon: string;
  group: string;
}

export interface AQILevel {
  status: string;
  className: string;
  color: string;
}

export interface SelectedLocationWeather {
  city: LocationEntry;
  weather: WeatherForecast;
}

export interface LocationQueryBounds {
  west: number;
  east: number;
  south: number;
  north: number;
  zoom: number;
  centerLat: number;
  centerLng: number;
  limit: number;
}
