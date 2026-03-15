import { fetchWeatherData, fetchAirQuality, getWeatherInfo } from "./weather.js";
import { weatherCache } from "./cache.js";
import { showWeatherPopup, closeDetailPanel } from "./popup.js";
import { initSearch } from "./search.js";
import { loadLocations, getCitiesInBounds, type Location } from "./locations.js";
import { MapWeatherOverlay } from "./mapAnimations.js";
import {
  MAP,
  BATCH_SIZE,
  BATCH_DELAY,
} from "./config.js";
import {
  loadSettings,
  getSettings,
  saveSettings,
  resetSettings,
  type AppSettings,
} from "./settings.js";

declare const L: {
  map: (element: string | HTMLElement, options: any) => IMap;
  marker: (latlng: [number, number], options?: any) => IMarker;
  divIcon: (options: any) => IIcon;
  control: any;
  tileLayer: (url: string, options?: any) => any;
  DomEvent: any;
};

interface IMap {
  on: (event: string, callback: (e?: any) => void) => void;
  off: (event: string) => void;
  getBounds: () => IBounds;
  getCenter: () => ILatLng;
  getZoom: () => number;
  removeLayer: (layer: IMarker) => void;
  addLayer: (layer: IMarker) => void;
  flyTo: (latlng: [number, number], zoom: number, options?: any) => void;
}

interface IBounds {
  getWest: () => number;
  getEast: () => number;
  getSouth: () => number;
  getNorth: () => number;
}

interface ILatLng {
  lat: number;
  lng: number;
}

interface IIcon {
  _setIconStyles: (img: HTMLElement, name: string) => void;
}

interface IMarker {
  setLatLng: (latlng: [number, number]) => void;
  setIcon: (icon: IIcon) => void;
  addTo: (map: IMap) => void;
  on: (event: string, callback: (e?: any) => void) => void;
  off: (event: string) => void;
  getElement: () => HTMLElement | undefined;
}

interface WeatherData {
  current: {
    weather_code: number;
    temperature_2m: number;
    is_day: boolean;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    surface_pressure: number;
    cloud_cover: number;
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
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
  };
}

interface CityMarker {
  marker: IMarker;
  city: Location;
  data: WeatherData;
}

let map: IMap;
let mapOverlay: MapWeatherOverlay;
let cityMarkers: CityMarker[] = [];
let markerPool: IMarker[] = [];
let initialLoadDone = false;
let currentFetchController: AbortController | null = null;
let isFetchingWeather = false;
let isErrorShowing = false;
let updatePending = false;

async function fetchWeatherBatch(
  cities: Location[],
  onProgress?: (city: Location, data: WeatherData) => void
): Promise<Array<{ city: Location; data: WeatherData } | null>> {
  if (currentFetchController) {
    currentFetchController.abort();
  }

  isFetchingWeather = true;
  currentFetchController = new AbortController();
  const { signal } = currentFetchController;

  const results: Array<{ city: Location; data: WeatherData } | null> = [];
  try {
    for (let i = 0; i < cities.length; i += BATCH_SIZE) {
      if (signal.aborted) break;

      const batch = cities.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (city) => {
        if (signal.aborted) return null;

        try {
          const data = await fetchWeatherData(city.lat, city.lng, signal);
          if (onProgress) onProgress(city, data);
          return { city, data };
        } catch (e) {
          const error = e as Error;
          if (error.name === "AbortError") return null;
          if (error.message && error.message.includes("429")) {
            showApiErrorToast(error.message);
          }
          return null;
        }
      });
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(Boolean));

      if (i + BATCH_SIZE < cities.length && !signal.aborted) {
        await new Promise<void>((r) => {
          const timer = window.setTimeout(r, BATCH_DELAY);
          signal.addEventListener("abort", () => clearTimeout(timer));
        });
      }
    }
  } finally {
    isFetchingWeather = false;
    if (currentFetchController?.signal === signal) {
      currentFetchController = null;
    }
  }
  return results;
}

function showApiErrorToast(msg: string): void {
  if (isErrorShowing) return;
  const toast = document.getElementById("api-error-toast");
  if (!toast) return;

  isErrorShowing = true;
  const waitMsg = `
    <div style="font-size: 15px; font-weight: bold; margin-bottom: 4px;">⚠️ FREE API RATE LIMIT EXCEEDED</div>
    <div style="font-size: 11px; opacity: 0.9; margin-bottom: 6px;">Too many requests. Please wait a moment and try again.</div>
    <div style="font-size: 9px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); pt-4; margin-top: 4px; display: inline-block;">
      Limits: 600 calls/min · 5,000 calls/hr · 10,000 calls/day
    </div>
  `;

  toast.innerHTML = waitMsg;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
    isErrorShowing = false;
  }, 5000);
}

function initMap(): void {
  let initialCenter: [number, number] = MAP.CENTER;
  let initialZoom = MAP.ZOOM;
  try {
    const savedState = localStorage.getItem("wwm_map_state");
    if (savedState) {
      const parsed = JSON.parse(savedState) as { center: [number, number]; zoom: number };
      if (parsed.center && parsed.zoom) {
        initialCenter = parsed.center;
        initialZoom = parsed.zoom;
      }
    }
  } catch {
  }

  map = L.map("map", {
    center: initialCenter,
    zoom: initialZoom,
    minZoom: MAP.MIN_ZOOM,
    maxZoom: MAP.MAX_ZOOM,
    zoomControl: false,
    worldCopyJump: true,
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer(MAP.TILE_URL, {
    attribution: MAP.TILE_ATTRIBUTION,
    maxZoom: 20,
  }).addTo(map);

  map.on("moveend", onMapInteraction);
  map.on("zoomend", onMapInteraction);

  loadSettings();
  initSettingsUI();

  loadLocations().then(() => {
    initialLoadDone = true;
    updateVisibleMarkers();
  });
}

function initSettingsUI(): void {
  const btn = document.getElementById("settings-btn");
  const overlay = document.getElementById("settings-overlay");
  const close = document.getElementById("settings-close");
  const saveBtn = document.getElementById("settings-save-btn");
  const resetBtn = document.getElementById("settings-reset-btn");

  if (!btn || !overlay || !close || !saveBtn || !resetBtn) return;

  btn.addEventListener("click", () => {
    const s = getSettings();
    const tempUnitInput = document.querySelector(
      `input[name="tempUnit"][value="${s.tempUnit}"]`
    ) as HTMLInputElement | null;
    if (tempUnitInput) tempUnitInput.checked = true;
    
    const boxCountInput = document.getElementById("setting-boxCount") as HTMLInputElement | null;
    if (boxCountInput) boxCountInput.value = s.boxCount.toString();
    
    const cacheDurationInput = document.getElementById("setting-cacheDuration") as HTMLInputElement | null;
    if (cacheDurationInput) cacheDurationInput.value = s.cacheDuration.toString();
    
    const animationsCheckbox = document.getElementById("setting-animations") as HTMLInputElement | null;
    if (animationsCheckbox) animationsCheckbox.checked = s.animations;
    
    const boxSizeSelect = document.getElementById("setting-boxSize") as HTMLSelectElement | null;
    if (boxSizeSelect) boxSizeSelect.value = s.boxSize;
    
    overlay.classList.add("active");
  });

  const closeMenu = () => overlay.classList.remove("active");
  close.addEventListener("click", closeMenu);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMenu();
  });

  saveBtn.addEventListener("click", () => {
    const tempUnitElement = document.querySelector(
      'input[name="tempUnit"]:checked'
    ) as HTMLInputElement | null;
    const boxCountElement = document.getElementById("setting-boxCount") as HTMLInputElement | null;
    const cacheDurationElement = document.getElementById("setting-cacheDuration") as HTMLInputElement | null;
    const animationsElement = document.getElementById("setting-animations") as HTMLInputElement | null;
    const boxSizeElement = document.getElementById("setting-boxSize") as HTMLSelectElement | null;

    if (!tempUnitElement || !boxCountElement || !cacheDurationElement || !animationsElement || !boxSizeElement) {
      return;
    }

    const newSettings: Partial<AppSettings> = {
      tempUnit: tempUnitElement.value as "C" | "F",
      boxCount: parseInt(boxCountElement.value) || 20,
      cacheDuration: parseInt(cacheDurationElement.value) || 5,
      animations: animationsElement.checked,
      boxSize: boxSizeElement.value as "small" | "medium" | "large",
    };
    saveSettings(newSettings);
    closeMenu();
    window.location.reload();
  });

  resetBtn.addEventListener("click", () => {
    resetSettings();
    closeMenu();
    window.location.reload();
  });
}

function applySettingsToMap(): void {
  const s = getSettings();
  cityMarkers.forEach((cm) => {
    const el = cm.marker.getElement();
    if (el) {
      el.className = `leaflet-marker-icon leaflet-zoom-animated leaflet-interactive marker-size-${s.boxSize}`;
    }
  });
  if (!s.animations && mapOverlay) {
    mapOverlay.stop();
  } else if (s.animations && mapOverlay) {
    mapOverlay.updateWeather("clear");
  }
  updatePending = true;
  requestAnimationFrame(() => {
    updatePending = false;
    updateVisibleMarkers();
  });
}

function saveMapState(): void {
  try {
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem(
      "wwm_map_state",
      JSON.stringify({ center: [center.lat, center.lng], zoom })
    );
  } catch {
  }
}

function onMapInteraction(): void {
  saveMapState();
  if (!initialLoadDone) return;

  if (updatePending) return;
  updatePending = true;

  requestAnimationFrame(() => {
    updatePending = false;
    updateVisibleMarkers();
  });
}

async function updateVisibleMarkers(): Promise<void> {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const visible = getCitiesInBounds(bounds, map.getZoom());

  const uniqueVisible: Location[] = [];
  const seen = new Set<string>();
  for (const c of visible) {
    const key = `${c.name}-${c.lat}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVisible.push(c);
    }
  }

  const citiesWithDistance = uniqueVisible.map((c) => ({
    ...c,
    _d: Math.pow(c.lat - center.lat, 2) + Math.pow(c.lng - center.lng, 2),
  }));
  
  citiesWithDistance.sort((a, b) => {
    const scoreA = a.priority || 1;
    const scoreB = b.priority || 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a._d - b._d;
  });

  const s = getSettings();
  const top = citiesWithDistance.slice(0, s.boxCount);

  const currentMap = new Map<string, CityMarker>();
  cityMarkers.forEach((cm) =>
    currentMap.set(`${cm.city.name}-${cm.city.lat}`, cm)
  );

  const newKeys = new Set(top.map((c) => `${c.name}-${c.lat}`));
  cityMarkers = cityMarkers.filter((cm) => {
    const key = `${cm.city.name}-${cm.city.lat}`;
    if (!newKeys.has(key)) {
      map.removeLayer(cm.marker);
      markerPool.push(cm.marker);
      return false;
    }
    return true;
  });

  const toAdd = top.filter((c) => !currentMap.has(`${c.name}-${c.lat}`));
  if (toAdd.length > 0) {
    showLoadingBar(true);
    await fetchWeatherBatch(toAdd, (city, data) =>
      addWeatherMarker(city, data)
    );
    showLoadingBar(false);
  }
}

function addWeatherMarker(city: Location, weatherData: WeatherData): void {
  const current = weatherData.current;
  if (!current) return;

  const wInfo = getWeatherInfo(current.weather_code, !!current.is_day);
  const s = getSettings();
  const tempC = Math.round(current.temperature_2m);
  const tempDisplay =
    s.tempUnit === "F" ? Math.round((tempC * 9) / 5 + 32) : tempC;
  const fxHtml = s.animations ? `<div class="hud-weather-fx"></div>` : "";

  const html = `<div class="hud-marker priority-${city.priority || 1} weather-${wInfo.group}">
      <div class="hud-card">
        ${fxHtml}
        <span class="hud-card-name">${city.name}</span>
        <div class="hud-card-row">
          <span class="hud-card-icon">${wInfo.icon}</span>
          <span class="hud-card-temp">${tempDisplay}°${s.tempUnit}</span>
        </div>
      </div>
    </div>`;

  const icon = L.divIcon({
    className: `hud-marker-container marker-size-${s.boxSize}`,
    html,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  let marker: IMarker;
  if (markerPool.length > 0) {
    marker = markerPool.pop()!;
    marker.setLatLng([city.lat, city.lng]);
    marker.setIcon(icon);
  } else {
    marker = L.marker([city.lat, city.lng], {
      icon,
      zIndexOffset: 1000,
    });
  }

  marker.addTo(map);
  marker.off("click");
  marker.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    const aqiPromise = fetchAirQuality(city.lat, city.lng);
    showWeatherPopup(city, weatherData, map, aqiPromise);
  });

  cityMarkers.push({ marker, city, data: weatherData });
}

function showLoadingBar(show: boolean): void {
  document.getElementById("loading-bar")?.classList.toggle("active", show);
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initSearch(map);
  mapOverlay = new MapWeatherOverlay("map-weather-canvas");

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetailPanel();
    if (e.key === "/" && !(e.target as HTMLElement).closest("input")) {
      e.preventDefault();
      (document.getElementById("search-input") as HTMLInputElement).focus();
    }
  });
});
