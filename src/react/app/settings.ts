/** This file centralizes settings defaults, persistence, and temperature formatting helpers. */
import { SETTINGS_OPTIONS, STORAGE_KEYS } from "./constants";
import type { AppSettings, MapViewportState } from "./types";
import { readStorage, removeStorage, writeStorage } from "./storage";

export const DEFAULT_SETTINGS: AppSettings = {
  tempUnit: "C",
  distanceSpeedUnit: "metric",
  boxCount: 15,
  cacheDuration: 15,
  animations: true,
  boxSize: "medium",
};

/** This function returns a valid option value or falls back to the default. */
function normalizeSettingOption(
  value: number | undefined,
  allowedValues: readonly number[],
  fallback: number,
): number {
  return value !== undefined && allowedValues.includes(value) ? value : fallback;
}

/** This function returns a valid string setting or falls back to the default. */
function normalizeStringSettingOption<T extends string>(
  value: T | undefined,
  allowedValues: readonly T[],
  fallback: T,
): T {
  return value !== undefined && allowedValues.includes(value) ? value : fallback;
}

/** This function loads the persisted application settings. */
export function loadSettings(): AppSettings {
  const storedSettings = readStorage<Partial<AppSettings>>(STORAGE_KEYS.settings) ?? {};

  return {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    tempUnit: normalizeStringSettingOption(
      storedSettings.tempUnit,
      ["C", "F"],
      DEFAULT_SETTINGS.tempUnit,
    ),
    distanceSpeedUnit: normalizeStringSettingOption(
      storedSettings.distanceSpeedUnit,
      ["metric", "imperial"],
      DEFAULT_SETTINGS.distanceSpeedUnit,
    ),
    boxCount: normalizeSettingOption(
      storedSettings.boxCount,
      SETTINGS_OPTIONS.boxCount,
      DEFAULT_SETTINGS.boxCount,
    ),
    cacheDuration: normalizeSettingOption(
      storedSettings.cacheDuration,
      SETTINGS_OPTIONS.cacheDuration,
      DEFAULT_SETTINGS.cacheDuration,
    ),
  };
}

/** This function saves application settings to localStorage. */
export function saveSettings(settings: AppSettings): void {
  writeStorage(STORAGE_KEYS.settings, settings);
}

/** This function resets application settings to their defaults. */
export function resetSettings(): AppSettings {
  removeStorage(STORAGE_KEYS.settings);
  return DEFAULT_SETTINGS;
}

/** This function converts Celsius into the active temperature unit. */
export function convertTemp(tempC: number, settings: AppSettings): number {
  if (settings.tempUnit === "F") {
    return (tempC * 9) / 5 + 32;
  }

  return tempC;
}

/** This function rounds a temperature value for display. */
export function formatTemp(tempC: number, settings: AppSettings): number {
  return Math.round(convertTemp(tempC, settings));
}

/** This function converts km/h into the active distance and speed unit. */
export function convertSpeed(speedKmH: number, settings: AppSettings): number {
  if (settings.distanceSpeedUnit === "imperial") {
    return speedKmH * 0.621371;
  }

  return speedKmH;
}

/** This function rounds a speed value for display. */
export function formatSpeed(speedKmH: number, settings: AppSettings): number {
  return Math.round(convertSpeed(speedKmH, settings));
}

/** This function returns the active speed unit label. */
export function getSpeedUnitLabel(settings: AppSettings): "km/h" | "mph" {
  return settings.distanceSpeedUnit === "imperial" ? "mph" : "km/h";
}

/** This function converts meters into the active distance unit. */
export function convertDistance(distanceMeters: number, settings: AppSettings): number {
  if (settings.distanceSpeedUnit === "imperial") {
    return distanceMeters * 0.000621371;
  }

  return distanceMeters / 1000;
}

/** This function formats a distance value for display. */
export function formatDistance(distanceMeters: number, settings: AppSettings): string {
  const convertedDistance = convertDistance(distanceMeters, settings);
  const unitLabel = settings.distanceSpeedUnit === "imperial" ? "mi" : "km";
  return `${convertedDistance.toFixed(1)} ${unitLabel}`;
}

/** This function loads the last saved map viewport state. */
export function loadMapViewport(): MapViewportState | null {
  return readStorage<MapViewportState>(STORAGE_KEYS.mapState);
}

/** This function saves the current map viewport state. */
export function saveMapViewport(viewport: MapViewportState): void {
  writeStorage(STORAGE_KEYS.mapState, viewport);
}
