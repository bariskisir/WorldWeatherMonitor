import {
  API,
  WEATHER_PARAMS,
  FORECAST_DAYS,
  SEARCH_RESULT_COUNT,
  SEARCH_MIN_LENGTH,
} from "./config.js";
import { getSettings } from "./settings.js";
import { aqiCache, weatherCache } from "./cache.js";






const WMO_CODES = {
  0: { description: "Clear Sky", icon: "☀️", iconNight: "🌙", group: "clear" },
  1: {
    description: "Mainly Clear",
    icon: "🌤️",
    iconNight: "🌙",
    group: "clear",
  },
  2: {
    description: "Partly Cloudy",
    icon: "⛅",
    iconNight: "☁️",
    group: "cloudy",
  },
  3: { description: "Overcast", icon: "☁️", iconNight: "☁️", group: "cloudy" },
  45: { description: "Foggy", icon: "🌫️", iconNight: "🌫️", group: "fog" },
  48: {
    description: "Depositing Rime Fog",
    icon: "🌫️",
    iconNight: "🌫️",
    group: "fog",
  },
  51: {
    description: "Light Drizzle",
    icon: "🌦️",
    iconNight: "🌧️",
    group: "drizzle",
  },
  53: {
    description: "Moderate Drizzle",
    icon: "🌦️",
    iconNight: "🌧️",
    group: "drizzle",
  },
  55: {
    description: "Dense Drizzle",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  56: {
    description: "Light Freezing Drizzle",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  57: {
    description: "Dense Freezing Drizzle",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  61: {
    description: "Slight Rain",
    icon: "🌦️",
    iconNight: "🌧️",
    group: "rain",
  },
  63: {
    description: "Moderate Rain",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  65: { description: "Heavy Rain", icon: "🌧️", iconNight: "🌧️", group: "rain" },
  66: {
    description: "Light Freezing Rain",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  67: {
    description: "Heavy Freezing Rain",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  71: {
    description: "Slight Snowfall",
    icon: "🌨️",
    iconNight: "🌨️",
    group: "snow",
  },
  73: {
    description: "Moderate Snowfall",
    icon: "❄️",
    iconNight: "❄️",
    group: "snow",
  },
  75: {
    description: "Heavy Snowfall",
    icon: "❄️",
    iconNight: "❄️",
    group: "snow",
  },
  77: {
    description: "Snow Grains",
    icon: "❄️",
    iconNight: "❄️",
    group: "snow",
  },
  80: {
    description: "Slight Rain Showers",
    icon: "🌦️",
    iconNight: "🌧️",
    group: "rain",
  },
  81: {
    description: "Moderate Rain Showers",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  82: {
    description: "Violent Rain Showers",
    icon: "🌧️",
    iconNight: "🌧️",
    group: "rain",
  },
  85: {
    description: "Slight Snow Showers",
    icon: "🌨️",
    iconNight: "🌨️",
    group: "snow",
  },
  86: {
    description: "Heavy Snow Showers",
    icon: "❄️",
    iconNight: "❄️",
    group: "snow",
  },
  95: {
    description: "Thunderstorm",
    icon: "⛈️",
    iconNight: "⛈️",
    group: "thunderstorm",
  },
  96: {
    description: "Thunderstorm with Slight Hail",
    icon: "⛈️",
    iconNight: "⛈️",
    group: "thunderstorm",
  },
  99: {
    description: "Thunderstorm with Heavy Hail",
    icon: "⛈️",
    iconNight: "⛈️",
    group: "thunderstorm",
  },
};
function getWeatherInfo(code, isDay = true) {
  const info = WMO_CODES[code] || {
    description: "Unknown",
    icon: "❓",
    iconNight: "❓",
    group: "clear",
  };
  return {
    description: info.description,
    icon: isDay ? info.icon : info.iconNight,
    group: info.group,
  };
}
function getWindDirection(degrees) {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(degrees / 22.5) % 16];
}
async function fetchWeatherData(lat, lng, signal = null) {
  const cached = weatherCache.get(lat, lng);
  if (cached && cached.hourly && cached.daily) {
    return cached;
  }




  const url = `${API.FORECAST}?latitude=${lat}&longitude=${lng}&current=${WEATHER_PARAMS.CURRENT}&hourly=${WEATHER_PARAMS.HOURLY}&daily=${WEATHER_PARAMS.DAILY}&timezone=auto&forecast_days=${FORECAST_DAYS}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    if (response.status === 429) {
      const errData = await response.json().catch(() => ({}));
      if (errData.error && errData.reason) {
        throw new Error(`429: ${errData.reason}`);
      }
    }
    throw new Error(`Weather API error: ${response.status}`);
  }
  const data = await response.json();
  if (data && data.current) {
    weatherCache.set(lat, lng, data);
  }


  return data;
}


async function fetchAirQuality(lat, lng, signal = null) {
  const cached = aqiCache.get(lat, lng);
  if (cached) return cached;

  const url = `${API.AIR_QUALITY}?latitude=${lat}&longitude=${lng}&current=${WEATHER_PARAMS.AIR_QUALITY}`;
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(`Air Quality API error: ${response.status}`);
  
  const data = await response.json();
  if (data && data.current) {
    aqiCache.set(lat, lng, data);
  }
  return data;
}



async function searchLocations(query) {
  if (!query || query.trim().length < SEARCH_MIN_LENGTH) return [];
  const url = `${API.GEOCODING}?name=${encodeURIComponent(query)}&count=${SEARCH_RESULT_COUNT}&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoding API error: ${response.status}`);
  const data = await response.json();
  return data.results || [];
}
function getAQILevel(aqi) {
  if (aqi <= 50) return { status: "Good", class: "good", color: "#4ade80" };
  if (aqi <= 100)
    return { status: "Moderate", class: "moderate", color: "#facc15" };
  if (aqi <= 150)
    return {
      status: "Unhealthy for Sensitive",
      class: "unhealthy-sensitive",
      color: "#fb923c",
    };
  if (aqi <= 200)
    return { status: "Unhealthy", class: "unhealthy", color: "#f87171" };
  return {
    status: "Very Unhealthy",
    class: "very-unhealthy",
    color: "#a78bfa",
  };
}
export {
  fetchWeatherData,
  fetchAirQuality,
  searchLocations,
  getWeatherInfo,
  getWindDirection,
  getAQILevel,
  WMO_CODES,
};
