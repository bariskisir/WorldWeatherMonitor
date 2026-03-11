const DEFAULT_SETTINGS = {
  tempUnit: "C",
  boxCount: 20,
  cacheDuration: 5,
  animations: true,
  boxSize: "medium",
};
let currentSettings = { ...DEFAULT_SETTINGS };
function loadSettings() {
  try {
    const saved = localStorage.getItem("wwm_settings");
    if (saved) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load settings", e);
  }
}
function saveSettings(newSettings) {
  currentSettings = { ...currentSettings, ...newSettings };
  try {
    localStorage.setItem("wwm_settings", JSON.stringify(currentSettings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}
function resetSettings() {
  currentSettings = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem("wwm_settings");
  } catch (e) {
    console.error("Failed to reset settings", e);
  }
}
function getSettings() {
  return { ...currentSettings };
}
function convertTemp(tempC) {
  if (currentSettings.tempUnit === "F") {
    return (tempC * 9) / 5 + 32;
  }
  return tempC;
}
function formatTemp(tempC) {
  return Math.round(convertTemp(tempC));
}
export {
  loadSettings,
  saveSettings,
  getSettings,
  resetSettings,
  convertTemp,
  formatTemp,
};
