/** This file renders the top-level application shell and coordinates feature modules. */
import { useCallback, useEffect, useRef, useState } from "react";
import { UI_CONFIG } from "../app/constants";
import {
  loadSettings,
  resetSettings,
  saveSettings,
} from "../app/settings";
import type {
  AppSettings,
  SearchLocationResult,
  SelectedLocationWeather,
} from "../app/types";
import { MapScene } from "../features/map/MapScene";
import { WeatherPopup } from "../features/popup/WeatherPopup";
import { SearchBar, type SearchBarHandle } from "../features/search/SearchBar";
import { SettingsModal } from "../features/settings/SettingsModal";

/** This component renders the complete WorldWeatherMonitor experience. */
export function App(): JSX.Element {
  const searchRef = useRef<SearchBarHandle | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState<SelectedLocationWeather | null>(null);
  const [focusRequest, setFocusRequest] = useState<SearchLocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    /** This function handles the global keyboard shortcuts used by the app. */
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setSelectedWeather(null);
      }

      if (
        event.key === "/" &&
        !(event.target instanceof HTMLElement && event.target.closest("input"))
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  /** This function saves settings in state and persistent storage. */
  const handleSaveSettings = useCallback((nextSettings: AppSettings): void => {
    saveSettings(nextSettings);
    setSettings(nextSettings);
  }, []);

  /** This function resets settings in state and persistent storage. */
  const handleResetSettings = useCallback((): void => {
    const resetValue = resetSettings();
    setSettings(resetValue);
  }, []);

  /** This function shows a rate-limit error toast for a short period. */
  const handleRateLimitError = useCallback((message: string): void => {
    setToastMessage(message);

    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, UI_CONFIG.toastDurationMs);
  }, []);

  return (
    <>
      <MapScene
        focusRequest={focusRequest}
        onFocusRequestHandled={() => setFocusRequest(null)}
        onLoadingChange={setIsLoading}
        onOpenWeatherPopup={setSelectedWeather}
        onRateLimitError={handleRateLimitError}
        settings={settings}
      />
      <div className={`loading-bar${isLoading ? " active" : ""}`} id="loading-bar">
        <div className="loading-bar-fill"></div>
      </div>
      <div className={`api-error-toast${toastMessage ? " active" : ""}`} id="api-error-toast">
        {toastMessage?.includes("429") ? (
          <>
            <div className="api-error-toast-title">FREE API RATE LIMIT EXCEEDED</div>
            <div className="api-error-toast-body">Too many requests. Please wait a moment and try again.</div>
            <div className="api-error-toast-meta">Limits: 600 calls/min · 5,000 calls/hr · 10,000 calls/day</div>
          </>
        ) : (
          toastMessage
        )}
      </div>
      <div id="search-hover-trigger"></div>
      <SearchBar
        ref={searchRef}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectLocation={setFocusRequest}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReset={handleResetSettings}
        onSave={handleSaveSettings}
        settings={settings}
      />
      <WeatherPopup
        onClose={() => setSelectedWeather(null)}
        selectedWeather={selectedWeather}
        settings={settings}
      />
    </>
  );
}
