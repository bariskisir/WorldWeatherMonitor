import type { WeatherForecast } from "./types";

/** This function finds the hourly forecast index that matches the API current time. */
export function getCurrentHourlyForecastIndex(weather: WeatherForecast): number {
  const currentTime = weather.current.time;

  if (!currentTime) {
    return 0;
  }

  const exactMatchIndex = weather.hourly.time.indexOf(currentTime);

  if (exactMatchIndex >= 0) {
    return exactMatchIndex;
  }

  const nextMatchIndex = weather.hourly.time.findIndex((time) => time >= currentTime);

  return nextMatchIndex >= 0 ? nextMatchIndex : 0;
}

/** This function formats an Open-Meteo local timestamp into an hour label without timezone drift. */
export function formatHourlyLabel(time: string): string {
  const hourText = time.slice(11, 13);

  return `${hourText}:00`;
}
