import { fetchWeatherData } from "./weather.js";
import { getWeatherInfo } from "./weather.js";
import { showWeatherPopup, closeDetailPanel } from "./popup.js";
import { initSearch } from "./search.js";
import { getCapitalLocations, getCitiesInBounds } from "./locations.js";
import { MapWeatherOverlay } from "./mapAnimations.js";
import {
  API,
  MAP,
  BATCH_SIZE,
  BATCH_DELAY,
  MAX_MARKERS,
  INITIAL_CAPITALS,
} from "./config.js";
import {
  loadSettings,
  getSettings,
  saveSettings,
  resetSettings,
} from "./settings.js";
let map, mapOverlay;
let cityMarkers = [];
let markerPool = [];
let cityWeatherCache = {};
let initialLoadDone = false;
let cachedGeoJSON = null;
function loadCacheFromStorage() {
  try {
    const stored = localStorage.getItem("wwm_weather_cache");
    if (stored) cityWeatherCache = JSON.parse(stored);
  } catch (e) {
    cityWeatherCache = {};
  }
}
function saveCacheToStorage() {
  try {
    localStorage.setItem("wwm_weather_cache", JSON.stringify(cityWeatherCache));
  } catch (e) {}
}
function getCachedWeather(key) {
  const entry = cityWeatherCache[key];
  if (!entry) return null;
  const cacheMs = getSettings().cacheDuration * 60 * 1000;
  if (Date.now() - entry.ts > cacheMs) {
    delete cityWeatherCache[key];
    saveCacheToStorage();
    return null;
  }
  return entry.data;
}
function setCachedWeather(key, data) {
  cityWeatherCache[key] = { data, ts: Date.now() };
  saveCacheToStorage();
}
async function fetchWeatherBatch(cities, onProgress) {
  const results = [];
  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (city) => {
      const key = `${city.lat},${city.lng}`;
      const cached = getCachedWeather(key);
      if (cached) {
        if (onProgress) onProgress(city, cached);
        return { city, data: cached };
      }
      try {
        const data = await fetchWeatherData(city.lat, city.lng);
        setCachedWeather(key, data);
        if (onProgress) onProgress(city, data);
        return { city, data };
      } catch (e) {
        if (e.message && e.message.includes("429")) {
          showApiErrorToast(e.message);
        }
        return null;
      }
    });
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(Boolean));
    if (i + BATCH_SIZE < cities.length)
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
  }
  return results;
}
function showApiErrorToast(msg) {
  const toast = document.getElementById("api-error-toast");
  if (!toast) return;
  if (msg) {
    const reason = msg.replace("429: ", "");
    toast.innerHTML = `<span style="font-size: 14px; font-weight: bold;">Rate Limit Exceeded</span><br><span style="font-size: 10px; opacity: 0.8;">${reason}</span>`;
  } else {
    toast.innerHTML = `<span style="font-size: 14px; font-weight: bold;">Rate Limit Exceeded</span><br><span style="font-size: 10px; opacity: 0.8;">Please try again later.</span>`;
  }
  toast.classList.add("active");
  setTimeout(() => toast.classList.remove("active"), 5000);
}
let countryBordersLayer = null;
function initMap() {
  let initialCenter = MAP.CENTER;
  let initialZoom = MAP.ZOOM;
  try {
    const savedState = localStorage.getItem("wwm_map_state");
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.center && parsed.zoom) {
        initialCenter = parsed.center;
        initialZoom = parsed.zoom;
      }
    }
  } catch (e) {}
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
  loadSettings();
  loadCacheFromStorage();
  initSettingsUI();
  loadCountryBorders();
  loadInitialView();
}
function initSettingsUI() {
  const btn = document.getElementById("settings-btn");
  const overlay = document.getElementById("settings-overlay");
  const close = document.getElementById("settings-close");
  const saveBtn = document.getElementById("settings-save-btn");
  const resetBtn = document.getElementById("settings-reset-btn");
  btn.addEventListener("click", () => {
    const s = getSettings();
    document.querySelector(
      `input[name="tempUnit"][value="${s.tempUnit}"]`,
    ).checked = true;
    document.getElementById("setting-boxCount").value = s.boxCount;
    document.getElementById("setting-cacheDuration").value = s.cacheDuration;
    document.getElementById("setting-animations").checked = s.animations;
    document.getElementById("setting-boxSize").value = s.boxSize;
    overlay.classList.add("active");
  });
  const closeMenu = () => overlay.classList.remove("active");
  close.addEventListener("click", closeMenu);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMenu();
  });
  saveBtn.addEventListener("click", () => {
    const newSettings = {
      tempUnit: document.querySelector('input[name="tempUnit"]:checked').value,
      boxCount:
        parseInt(document.getElementById("setting-boxCount").value) || 20,
      cacheDuration:
        parseInt(document.getElementById("setting-cacheDuration").value) || 5,
      animations: document.getElementById("setting-animations").checked,
      boxSize: document.getElementById("setting-boxSize").value,
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
function applySettingsToMap() {
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
async function loadCountryBorders() {
  try {
    if (!cachedGeoJSON) {
      const resp = await fetch(API.GEOJSON);
      cachedGeoJSON = await resp.json();
    }
    countryBordersLayer = L.geoJSON(cachedGeoJSON, {
      style: () => ({
        color: "rgba(0, 229, 255, 0.15)",
        weight: 1,
        fillColor: "transparent",
        fillOpacity: 0,
      }),
      interactive: false,
    }).addTo(map);
    map.on("moveend", onMapInteraction);
    map.on("zoomend", onMapInteraction);
  } catch (e) {}
}
async function loadInitialView() {
  const cities = getCapitalLocations().slice(0, INITIAL_CAPITALS);
  showLoadingBar(true);
  await fetchWeatherBatch(cities, (city, data) => addWeatherMarker(city, data));
  showLoadingBar(false);
  initialLoadDone = true;
  updateVisibleMarkers();
}
let lastUpdateBounds = null;
let updatePending = false;
function saveMapState() {
  try {
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem(
      "wwm_map_state",
      JSON.stringify({ center: [center.lat, center.lng], zoom }),
    );
  } catch (e) {}
}
function onMapInteraction() {
  saveMapState();
  if (!initialLoadDone) return;
  if (updatePending) return;
  updatePending = true;
  requestAnimationFrame(() => {
    updatePending = false;
    updateVisibleMarkers();
  });
}
async function updateVisibleMarkers() {
  const bounds = map.getBounds();
  if (lastUpdateBounds && lastUpdateBounds.equals(bounds)) return;
  lastUpdateBounds = bounds;
  const center = map.getCenter();
  const visible = getCitiesInBounds(bounds, map.getZoom());
  const uniqueVisible = [];
  const seen = new Set();
  for (const c of visible) {
    const key = `${c.name}-${c.lat}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVisible.push(c);
    }
  }
  uniqueVisible.forEach((c) => {
    c._d = Math.pow(c.lat - center.lat, 2) + Math.pow(c.lng - center.lng, 2);
  });
  uniqueVisible.sort((a, b) => {
    const scoreA = a.isCapital ? 2 : a.isCity ? 1 : 0;
    const scoreB = b.isCapital ? 2 : b.isCity ? 1 : 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a._d - b._d;
  });
  const s = getSettings();
  const top = uniqueVisible.slice(0, s.boxCount);
  const currentMap = new Map();
  cityMarkers.forEach((cm) =>
    currentMap.set(`${cm.city.name}-${cm.city.lat}`, cm),
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
    await fetchWeatherBatch(toAdd, (city, data) => addWeatherMarker(city, data));
    showLoadingBar(false);
  }
}
function addWeatherMarker(city, weatherData) {
  const current = weatherData.current;
  if (!current) return;
  const wInfo = getWeatherInfo(current.weather_code, !!current.is_day);
  const s = getSettings();
  const tempC = Math.round(current.temperature_2m);
  const tempDisplay =
    s.tempUnit === "F" ? Math.round((tempC * 9) / 5 + 32) : tempC;
  const colorClass = tempC >= 20 ? "warm" : "cool";
  const fxHtml = s.animations ? `<div class="hud-weather-fx"></div>` : "";
  const html = `<div class="hud-marker ${colorClass} weather-${wInfo.group}">
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
  let marker;
  if (markerPool.length > 0) {
    marker = markerPool.pop();
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
    showWeatherPopup(city, weatherData, map);
  });
  cityMarkers.push({ marker, city, data: weatherData });
}
function showLoadingBar(show) {
  document.getElementById("loading-bar").classList.toggle("active", show);
}
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initSearch(map);
  mapOverlay = new MapWeatherOverlay("map-weather-canvas");
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetailPanel();
    if (e.key === "/" && !e.target.closest("input")) {
      e.preventDefault();
      document.getElementById("search-input").focus();
    }
  });
});
