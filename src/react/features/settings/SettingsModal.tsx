/** This file renders the settings modal that controls application preferences. */
import { useEffect, useState } from "react";
import { SETTINGS_OPTIONS } from "../../app/constants";
import { DEFAULT_SETTINGS } from "../../app/settings";
import type { AppSettings } from "../../app/types";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  onReset: () => void;
}

/** This component renders the settings dialog and its form controls. */
export function SettingsModal({
  isOpen,
  settings,
  onClose,
  onSave,
  onReset,
}: SettingsModalProps): JSX.Element {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const boxCountIndex = SETTINGS_OPTIONS.boxCount.findIndex((value) => value === draft.boxCount);
  const cacheDurationIndex = SETTINGS_OPTIONS.cacheDuration.findIndex(
    (value) => value === draft.cacheDuration,
  );

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
    }
  }, [isOpen, settings]);

  /** This function updates a draft settings field while preserving the rest of the form. */
  function updateDraft<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  /** This function submits the current form values to the parent component. */
  function handleSave(): void {
    onSave(draft);
    onClose();
  }

  /** This function resets settings back to the documented defaults. */
  function handleReset(): void {
    setDraft(DEFAULT_SETTINGS);
    onReset();
    onClose();
  }

  return (
    <div className={`settings-overlay${isOpen ? " active" : ""}`} id="settings-overlay" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="settings-modal" id="settings-modal">
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Settings</h2>
          <div className="settings-close" id="settings-close" onClick={onClose}>
            ✕
          </div>
        </div>
        <div className="settings-body">
          <div className="setting-group">
            <label className="setting-label">Temperature Unit</label>
            <div className="setting-control">
              <label className="radio-label">
                <input
                  checked={draft.tempUnit === "C"}
                  name="tempUnit"
                  type="radio"
                  value="C"
                  onChange={() => updateDraft("tempUnit", "C")}
                />
                Celsius (°C)
              </label>
              <label className="radio-label">
                <input
                  checked={draft.tempUnit === "F"}
                  name="tempUnit"
                  type="radio"
                  value="F"
                  onChange={() => updateDraft("tempUnit", "F")}
                />
                Fahrenheit (°F)
              </label>
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label">Distance & Speed Unit</label>
            <div className="setting-control">
              <label className="radio-label">
                <input
                  checked={draft.distanceSpeedUnit === "metric"}
                  name="distanceSpeedUnit"
                  type="radio"
                  value="metric"
                  onChange={() => updateDraft("distanceSpeedUnit", "metric")}
                />
                km, km/h
              </label>
              <label className="radio-label">
                <input
                  checked={draft.distanceSpeedUnit === "imperial"}
                  name="distanceSpeedUnit"
                  type="radio"
                  value="imperial"
                  onChange={() => updateDraft("distanceSpeedUnit", "imperial")}
                />
                mi, mph
              </label>
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label">Max Visible Markers</label>
            <div className="setting-control setting-control-slider">
              <span className="settings-slider-value">{draft.boxCount}</span>
              <input
                className="settings-range"
                max={SETTINGS_OPTIONS.boxCount.length - 1}
                min={0}
                step={1}
                type="range"
                value={Math.max(boxCountIndex, 0)}
                onChange={(event) =>
                  updateDraft(
                    "boxCount",
                    SETTINGS_OPTIONS.boxCount[Number(event.target.value)] ?? DEFAULT_SETTINGS.boxCount,
                  )
                }
              />
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label">Cache Duration (Mins)</label>
            <div className="setting-control setting-control-slider">
              <span className="settings-slider-value">{draft.cacheDuration}</span>
              <input
                className="settings-range"
                max={SETTINGS_OPTIONS.cacheDuration.length - 1}
                min={0}
                step={1}
                type="range"
                value={Math.max(cacheDurationIndex, 0)}
                onChange={(event) =>
                  updateDraft(
                    "cacheDuration",
                    SETTINGS_OPTIONS.cacheDuration[Number(event.target.value)] ??
                      DEFAULT_SETTINGS.cacheDuration,
                  )
                }
              />
            </div>
          </div>
          <div className="setting-group">
            <label className="setting-label">Weather Animations</label>
            <label className="toggle-switch">
              <input
                checked={draft.animations}
                type="checkbox"
                onChange={(event) => updateDraft("animations", event.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-group">
            <label className="setting-label">Marker Size</label>
            <select
              className="settings-select"
              value={draft.boxSize}
              onChange={(event) =>
                updateDraft("boxSize", event.target.value as AppSettings["boxSize"])
              }
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
        <div className="settings-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="settings-save-btn"
            id="settings-reset-btn"
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(255, 255, 255, 0.3)",
              color: "#fff",
            }}
            type="button"
            onClick={handleReset}
          >
            Reset
          </button>
          <button className="settings-save-btn" id="settings-save-btn" type="button" onClick={handleSave}>
            Save
          </button>
        </div>
        <div className="settings-credits">
          Created by <a href="https://www.bariskisir.com" rel="noreferrer" target="_blank">Barış Kısır</a> •{" "}
          <a href="https://github.com/bariskisir/WorldWeatherMonitor" rel="noreferrer" target="_blank">Source</a> •{" "}
          Data from <a href="https://open-meteo.com/" rel="noreferrer" target="_blank">Open-Meteo</a>
        </div>
      </div>
    </div>
  );
}
