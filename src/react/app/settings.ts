/** This file centralizes settings defaults, persistence, and temperature formatting helpers. */
import { SETTINGS_OPTIONS, STORAGE_KEYS } from "./constants";
import type { AppSettings, MapViewportState } from "./types";
import { readStorage, removeStorage, writeStorage } from "./storage";

export const DEFAULT_SETTINGS: AppSettings = {
  tempUnit: "C",
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

/** This function loads the persisted application settings. */
export function loadSettings(): AppSettings {
  const storedSettings = readStorage<Partial<AppSettings>>(STORAGE_KEYS.settings) ?? {};

  return {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
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

/** This function loads the last saved map viewport state. */
export function loadMapViewport(): MapViewportState | null {
  return readStorage<MapViewportState>(STORAGE_KEYS.mapState);
}

/** This function saves the current map viewport state. */
export function saveMapViewport(viewport: MapViewportState): void {
  writeStorage(STORAGE_KEYS.mapState, viewport);
}
