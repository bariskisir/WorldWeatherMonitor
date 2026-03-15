interface AppSettings {
  tempUnit: "C" | "F";
  boxCount: number;
  cacheDuration: number;
  animations: boolean;
  boxSize: "small" | "medium" | "large";
}

const DEFAULT_SETTINGS: AppSettings = {
  tempUnit: "C",
  boxCount: 20,
  cacheDuration: 5,
  animations: true,
  boxSize: "medium",
};

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };

function loadSettings(): void {
  try {
    const saved = localStorage.getItem("wwm_settings");
    if (saved) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load settings", e);
  }
}

function saveSettings(newSettings: Partial<AppSettings>): void {
  currentSettings = { ...currentSettings, ...newSettings };
  try {
    localStorage.setItem("wwm_settings", JSON.stringify(currentSettings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}

function resetSettings(): void {
  currentSettings = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem("wwm_settings");
  } catch (e) {
    console.error("Failed to reset settings", e);
  }
}

function getSettings(): AppSettings {
  return { ...currentSettings };
}

function convertTemp(tempC: number): number {
  if (currentSettings.tempUnit === "F") {
    return (tempC * 9) / 5 + 32;
  }
  return tempC;
}

function formatTemp(tempC: number): number {
  return Math.round(convertTemp(tempC));
}

export {
  loadSettings,
  saveSettings,
  getSettings,
  resetSettings,
  convertTemp,
  formatTemp,
  type AppSettings,
};
