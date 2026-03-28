/** This file contains pure helper functions used by the MapScene marker system. */
import L from "leaflet";
import { getMinimumPriorityForZoom, UI_CONFIG } from "../../app/constants";
import { formatTemp } from "../../app/settings";
import type { AppSettings, LocationEntry, WeatherForecast } from "../../app/types";
import { getWeatherInfo } from "../../services/weatherMappings";

/** This function generates the stable key used for marker bookkeeping. */
export function getLocationKey(location: LocationEntry): string {
  return `${location.name}-${location.lat}`;
}

/** This function checks whether a location is allowed at the current zoom level. */
export function isLocationAllowedAtZoom(location: LocationEntry, zoom: number): boolean {
  return location.priority >= getMinimumPriorityForZoom(zoom);
}

/** This function ranks locations by priority and proximity to the viewport center. */
export function sortLocationsForViewport(
  locations: LocationEntry[],
  center: L.LatLng,
): LocationEntry[] {
  return [...locations].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    const leftDistance = (left.lat - center.lat) ** 2 + (left.lng - center.lng) ** 2;
    const rightDistance = (right.lat - center.lat) ** 2 + (right.lng - center.lng) ** 2;
    return leftDistance - rightDistance;
  });
}

/** This function renders the marker HTML string for a location and weather payload. */
export function createMarkerIcon(
  location: LocationEntry,
  weather: WeatherForecast,
  settings: AppSettings,
): L.DivIcon {
  const currentWeather = weather.current;
  const weatherInfo = getWeatherInfo(currentWeather.weather_code, Boolean(currentWeather.is_day));
  const displayedTemp = formatTemp(currentWeather.temperature_2m, settings);
  const fxHtml = settings.animations ? '<div class="hud-weather-fx"></div>' : "";
  const html = `<div class="hud-marker priority-${location.priority || 1} weather-${weatherInfo.group}">
      <div class="hud-card">
        ${fxHtml}
        <span class="hud-card-name">${location.name}</span>
        <div class="hud-card-row">
          <span class="hud-card-icon">${weatherInfo.icon}</span>
          <span class="hud-card-temp">${displayedTemp}°${settings.tempUnit}</span>
        </div>
      </div>
    </div>`;

  return L.divIcon({
    className: `hud-marker-container marker-size-${settings.boxSize}`,
    html,
    iconSize: [UI_CONFIG.markerIconSize, UI_CONFIG.markerIconSize],
    iconAnchor: [UI_CONFIG.markerIconAnchor, UI_CONFIG.markerIconAnchor],
  });
}
