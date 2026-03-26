/** This file contains weather and AQI lookup helpers used by the UI. */
import type { AQILevel, ReturnedWeatherInfo, WeatherInfo } from "../app/types";

export const WMO_CODES: Record<number, WeatherInfo> = {
  0: { description: "Clear Sky", icon: "☀️", iconNight: "🌙", group: "clear" },
  1: { description: "Mainly Clear", icon: "🌤️", iconNight: "🌙", group: "clear" },
  2: { description: "Partly Cloudy", icon: "⛅", iconNight: "☁️", group: "cloudy" },
  3: { description: "Overcast", icon: "☁️", iconNight: "☁️", group: "cloudy" },
  45: { description: "Foggy", icon: "🌫️", iconNight: "🌫️", group: "fog" },
  48: { description: "Depositing Rime Fog", icon: "🌫️", iconNight: "🌫️", group: "fog" },
  51: { description: "Light Drizzle", icon: "🌦️", iconNight: "🌧️", group: "drizzle" },
  53: { description: "Moderate Drizzle", icon: "🌦️", iconNight: "🌧️", group: "drizzle" },
  55: { description: "Dense Drizzle", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  56: { description: "Light Freezing Drizzle", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  57: { description: "Dense Freezing Drizzle", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  61: { description: "Slight Rain", icon: "🌦️", iconNight: "🌧️", group: "rain" },
  63: { description: "Moderate Rain", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  65: { description: "Heavy Rain", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  66: { description: "Light Freezing Rain", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  67: { description: "Heavy Freezing Rain", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  71: { description: "Slight Snowfall", icon: "🌨️", iconNight: "🌨️", group: "snow" },
  73: { description: "Moderate Snowfall", icon: "❄️", iconNight: "❄️", group: "snow" },
  75: { description: "Heavy Snowfall", icon: "❄️", iconNight: "❄️", group: "snow" },
  77: { description: "Snow Grains", icon: "❄️", iconNight: "❄️", group: "snow" },
  80: { description: "Slight Rain Showers", icon: "🌦️", iconNight: "🌧️", group: "rain" },
  81: { description: "Moderate Rain Showers", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  82: { description: "Violent Rain Showers", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  85: { description: "Slight Snow Showers", icon: "🌨️", iconNight: "🌨️", group: "snow" },
  86: { description: "Heavy Snow Showers", icon: "❄️", iconNight: "❄️", group: "snow" },
  95: { description: "Thunderstorm", icon: "⛈️", iconNight: "⛈️", group: "thunderstorm" },
  96: { description: "Thunderstorm with Slight Hail", icon: "⛈️", iconNight: "⛈️", group: "thunderstorm" },
  99: { description: "Thunderstorm with Heavy Hail", icon: "⛈️", iconNight: "⛈️", group: "thunderstorm" },
};

/** This function resolves weather metadata for a WMO code. */
export function getWeatherInfo(code: number, isDay = true): ReturnedWeatherInfo {
  const info = WMO_CODES[code] ?? {
    description: "Unknown",
    icon: "❔",
    iconNight: "❔",
    group: "clear",
  };

  return {
    description: info.description,
    icon: isDay ? info.icon : info.iconNight,
    group: info.group,
  };
}

/** This function maps AQI values into status metadata used by the popup. */
export function getAQILevel(aqi: number): AQILevel {
  if (aqi <= 50) {
    return { status: "Good", className: "good", color: "#4ade80" };
  }

  if (aqi <= 100) {
    return { status: "Moderate", className: "moderate", color: "#facc15" };
  }

  if (aqi <= 150) {
    return {
      status: "Unhealthy for Sensitive",
      className: "unhealthy-sensitive",
      color: "#fb923c",
    };
  }

  if (aqi <= 200) {
    return { status: "Unhealthy", className: "unhealthy", color: "#f87171" };
  }

  return {
    status: "Very Unhealthy",
    className: "very-unhealthy",
    color: "#a78bfa",
  };
}
