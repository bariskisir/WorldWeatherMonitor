/** This file renders the weather detail popup and its animated content. */
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { UI_CONFIG } from "../../app/constants";
import {
  formatDistance,
  formatSpeed,
  formatTemp,
  getSpeedUnitLabel,
} from "../../app/settings";
import { formatHourlyLabel, getCurrentHourlyForecastIndex } from "../../app/time";
import type {
  AirQualitySnapshot,
  AppSettings,
  MarineSnapshot,
  SelectedLocationWeather,
} from "../../app/types";
import { WeatherChart } from "../../components/WeatherChart";
import { fetchAirQuality, fetchMarineData } from "../../services/weatherApi";
import { getAQILevel, getWeatherInfo } from "../../services/weatherMappings";
import { WeatherAnimation } from "../../legacy/WeatherAnimation";
import { useAbortableFetch } from "../../hooks/useAbortableFetch";

interface WeatherPopupProps {
  selectedWeather: SelectedLocationWeather | null;
  settings: AppSettings;
  onClose: () => void;
}

/** This function extracts the max sea surface temperature from a marine snapshot. */
function extractMaxSeaTemperature(snapshot: MarineSnapshot): number | null {
  return (
    snapshot.hourly?.sea_surface_temperature?.reduce<number | null>((currentMax, value) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return currentMax;
      }

      return currentMax === null ? value : Math.max(currentMax, value);
    }, null) ?? null
  );
}

/** This function formats a YYYY-MM-DD string as dd.MM for the daily forecast list. */
function formatDailyListLabel(time: string): string {
  const [year, month, day] = time.split("-");

  if (!year || !month || !day) {
    return time;
  }

  return `${day}.${month}`;
}

/** This component renders the full weather detail dialog. */
export function WeatherPopup({
  selectedWeather,
  settings,
  onClose,
}: WeatherPopupProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchKey = selectedWeather
    ? `${selectedWeather.city.lat},${selectedWeather.city.lng}`
    : null;

  const aqiFetcher = useCallback(
    (signal: AbortSignal) => {
      if (!selectedWeather) {
        return Promise.reject(new Error("No location selected"));
      }

      return fetchAirQuality(
        selectedWeather.city.lat,
        selectedWeather.city.lng,
        settings,
        signal,
      );
    },
    [selectedWeather, settings],
  );

  const marineFetcher = useCallback(
    (signal: AbortSignal) => {
      if (!selectedWeather) {
        return Promise.reject(new Error("No location selected"));
      }

      return fetchMarineData(
        selectedWeather.city.lat,
        selectedWeather.city.lng,
        settings,
        signal,
      );
    },
    [selectedWeather, settings],
  );

  const { data: airQuality, isLoading: isAQILoading } = useAbortableFetch<AirQualitySnapshot>(
    fetchKey,
    selectedWeather ? aqiFetcher : null,
  );

  const { data: marineData } = useAbortableFetch<MarineSnapshot>(
    fetchKey,
    selectedWeather ? marineFetcher : null,
  );

  const seaSurfaceTemperatureMax = marineData ? extractMaxSeaTemperature(marineData) : null;

  useEffect(() => {
    if (!selectedWeather) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const animation = new WeatherAnimation(canvas);
    const weatherInfo = getWeatherInfo(
      selectedWeather.weather.current.weather_code,
      Boolean(selectedWeather.weather.current.is_day),
    );

    if (settings.animations) {
      animation.setWeather(
        weatherInfo.group,
        Boolean(selectedWeather.weather.current.is_day),
      );
    }

    return () => {
      animation.stop();
    };
  }, [selectedWeather, settings.animations]);

  const derivedState = useMemo(() => {
    if (!selectedWeather) {
      return null;
    }

    const { city, weather } = selectedWeather;
    const current = weather.current;
    const daily = weather.daily;
    const hourly = weather.hourly;
    const isDay = Boolean(current.is_day);
    const weatherInfo = getWeatherInfo(current.weather_code, isDay);
    const currentHourlyIndex = getCurrentHourlyForecastIndex(weather);

    return {
      city,
      weather,
      current,
      daily,
      weatherInfo,
      hourlyItems: hourly.time
        .slice(currentHourlyIndex, currentHourlyIndex + UI_CONFIG.popupHourlyItemCount)
        .map((time, index) => {
          const actualIndex = currentHourlyIndex + index;
          return {
            label: actualIndex === currentHourlyIndex ? "Now" : formatHourlyLabel(time),
            icon: getWeatherInfo(
              hourly.weather_code[actualIndex],
              hourly.is_day?.[actualIndex] ?? true,
            ).icon,
            temp: `${formatTemp(hourly.temperature_2m[actualIndex], settings)}°${settings.tempUnit}`,
          };
        }),
      dailyItems: daily.time.map((time, index) => ({
        label: formatDailyListLabel(time),
        icon: getWeatherInfo(daily.weather_code[index], true).icon,
        high: `${formatTemp(daily.temperature_2m_max[index], settings)}°${settings.tempUnit}`,
        low: `${formatTemp(daily.temperature_2m_min[index], settings)}°${settings.tempUnit}`,
      })),
      sunrise: daily.sunrise?.[0]
        ? new Date(daily.sunrise[0]).toLocaleTimeString("en", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      sunset: daily.sunset?.[0]
        ? new Date(daily.sunset[0]).toLocaleTimeString("en", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
    };
  }, [selectedWeather, settings]);

  if (!derivedState) {
    return null;
  }

  const aqiValue = Math.round(airQuality?.current.us_aqi ?? 0);
  const aqiLevel = getAQILevel(aqiValue);
  const isWarm = Math.round(derivedState.current.temperature_2m) >= UI_CONFIG.popupWarmThresholdC;

  /** This function closes the popup without letting the click reach the map below it. */
  function handleCloseClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onClose();
  }

  /** This function keeps clicks inside the popup from reaching the map layer. */
  function handlePopupClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  return (
    <div
      className="detail-popup open"
      role="dialog"
      aria-modal="true"
      onClick={handlePopupClick}
    >
      <div className="dp-header">
        <div className="dp-anim-area">
          <canvas id="popup-canvas" ref={canvasRef}></canvas>
          <div className="dp-hero">
            <button
              className="dp-close"
              id="dp-close"
              type="button"
              onClick={handleCloseClick}
            >
              ×
            </button>
            <div className="dp-location">{derivedState.city.name}</div>
            <div className="dp-country">
              {derivedState.city.country} · {derivedState.city.lat.toFixed(2)}°,{" "}
              {derivedState.city.lng.toFixed(2)}°
            </div>
            <div className="dp-temp-row">
              <span className={`dp-temp${isWarm ? " warm" : ""}`}>
                {formatTemp(derivedState.current.temperature_2m, settings)}°
                <span style={{ fontSize: 18, marginLeft: -5 }}>{settings.tempUnit}</span>
              </span>
              <span className="dp-icon">{derivedState.weatherInfo.icon}</span>
            </div>
            <div className="dp-desc">{derivedState.weatherInfo.description}</div>
          </div>
        </div>
      </div>
      <div className="dp-body">
        <div className="dp-grid">
          <div className="dp-col-left">
            <div className="dp-stats">
              <div className="dp-stat">
                <span className="ds-icon">🌡️</span>
                <span className="ds-val">
                  {formatTemp(derivedState.current.apparent_temperature, settings)}°
                  {settings.tempUnit}
                </span>
                <span className="ds-lbl">Feels Like</span>
              </div>
              <div className="dp-stat">
                <span className="ds-icon">💧</span>
                <span className="ds-val">{derivedState.current.relative_humidity_2m}%</span>
                <span className="ds-lbl">Humidity</span>
              </div>
              <div className="dp-stat">
                <span className="ds-icon">💨</span>
                <span className="ds-val">
                  {formatSpeed(
                    derivedState.daily.wind_speed_10m_max?.[0] ??
                      derivedState.current.wind_speed_10m,
                    settings,
                  )}{" "}
                  {getSpeedUnitLabel(settings)}
                </span>
                <span className="ds-lbl">Wind Max</span>
              </div>
              <div className="dp-stat">
                <span className="ds-icon">☀️</span>
                <span className="ds-val">
                  {derivedState.daily.uv_index_max?.[0]?.toFixed(1) ?? "-"}
                </span>
                <span className="ds-lbl">UV Max</span>
              </div>
              <div className="dp-stat">
                <span className="ds-icon">👁️</span>
                <span className="ds-val">
                  {derivedState.current.visibility !== undefined
                    ? formatDistance(derivedState.current.visibility, settings)
                    : "-"}
                </span>
                <span className="ds-lbl">Visibility</span>
              </div>
              {seaSurfaceTemperatureMax !== null ? (
                <div className="dp-stat">
                  <span className="ds-icon">🌊</span>
                  <span className="ds-val">
                    {formatTemp(seaSurfaceTemperatureMax, settings)}°{settings.tempUnit}
                  </span>
                  <span className="ds-lbl">Sea Max</span>
                </div>
              ) : null}
            </div>
            <div className="dp-sun-row">
              <div className="dp-sun">🌅 {derivedState.sunrise}</div>
              <div className="dp-sun">🌇 {derivedState.sunset}</div>
            </div>
            <div id="dp-aqi-section">
              <div className="dp-section-title">Air Quality</div>
              {isAQILoading ? (
                <div className="aqi-skeleton"></div>
              ) : airQuality?.current ? (
                <div className="dp-aqi">
                  <div className={`dp-aqi-gauge ${aqiLevel.className}`}>
                    <span className="dp-aqi-num">{aqiValue}</span>
                    <span className="dp-aqi-lbl">AQI</span>
                  </div>
                  <div className="dp-aqi-info">
                    <div className="dp-aqi-status" style={{ color: aqiLevel.color }}>
                      {aqiLevel.status}
                    </div>
                    <div className="dp-aqi-detail">
                      PM2.5: {airQuality.current.pm2_5?.toFixed(1) ?? "-"} · PM10:{" "}
                      {airQuality.current.pm10?.toFixed(1) ?? "-"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dp-aqi">
                  <div className="dp-aqi-info">
                    <div className="dp-aqi-detail">Air quality data is unavailable.</div>
                  </div>
                </div>
              )}
            </div>
            <div className="dp-section-title">Daily Trends</div>
            <div className="dp-chart-wrap">
              <WeatherChart data={derivedState.weather} settings={settings} variant="daily" />
            </div>
          </div>
          <div className="dp-col-right">
            <div className="dp-section-title">24h Forecast</div>
            <div className="dp-hourly-scroll">
              {derivedState.hourlyItems.map((item) => (
                <div className="popup-hour" key={`${item.label}-${item.temp}`}>
                  <span className="ph-time">{item.label}</span>
                  <span className="ph-icon">{item.icon}</span>
                  <span className="ph-temp">{item.temp}</span>
                </div>
              ))}
            </div>
            <div className="dp-section-title">14-Day</div>
            <div className="dp-daily-list">
              {derivedState.dailyItems.map((item) => (
                <div className="popup-day" key={`${item.label}-${item.high}`}>
                  <span className="pd-name">{item.label}</span>
                  <span className="pd-icon">{item.icon}</span>
                  <span className="pd-high">{item.high}</span>
                  <span className="pd-low">{item.low}</span>
                </div>
              ))}
            </div>
            <div className="dp-section-title">Hourly Temp</div>
            <div className="dp-chart-wrap">
              <WeatherChart data={derivedState.weather} settings={settings} variant="hourly" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
