import {
  fetchWeatherData,
  fetchAirQuality,
  getWeatherInfo,
  getAQILevel,
} from "./weather.js";
import { WeatherAnimation } from "./animations.js";
import { createHourlyChart, createDailyChart } from "./charts.js";
import { getSettings, formatTemp } from "./settings.js";
let detailPanel = null;
function showWeatherPopup(city, weatherData, map) {
  closeDetailPanel();
  const current = weatherData.current;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly;
  const isDay = !!current.is_day;
  const wInfo = getWeatherInfo(current.weather_code, isDay);
  const tempOriginal = Math.round(current.temperature_2m);
  const tempDisp = formatTemp(current.temperature_2m);
  const isWarm = tempOriginal >= 20;
  const settings = getSettings();
  const curHour = new Date().getHours();
  let hourlyHtml = "";
  for (let i = curHour; i < curHour + 12 && i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]);
    const hInfo = getWeatherInfo(
      hourly.weather_code[i],
      hourly.is_day?.[i] ?? true,
    );
    hourlyHtml += `<div class="popup-hour">
          <span class="ph-time">${i === curHour ? "Now" : t.getHours() + ":00"}</span>
          <span class="ph-icon">${hInfo.icon}</span>
          <span class="ph-temp">${formatTemp(hourly.temperature_2m[i])}°${settings.tempUnit}</span>
        </div>`;
  }
  let dailyHtml = "";
  for (let i = 0; i < daily.time.length; i++) {
    const d = new Date(daily.time[i]);
    const dayName =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en", { weekday: "short" });
    const dInfo = getWeatherInfo(daily.weather_code[i], true);
    dailyHtml += `<div class="popup-day">
          <span class="pd-name">${dayName}</span>
          <span class="pd-icon">${dInfo.icon}</span>
          <span class="pd-high">${formatTemp(daily.temperature_2m_max[i])}°${settings.tempUnit}</span>
          <span class="pd-low">${formatTemp(daily.temperature_2m_min[i])}°${settings.tempUnit}</span>
        </div>`;
  }
  const sunrise = daily.sunrise?.[0]
    ? new Date(daily.sunrise[0]).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const sunset = daily.sunset?.[0]
    ? new Date(daily.sunset[0]).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const panel = document.createElement("div");
  panel.className = "detail-popup";
  panel.innerHTML = `
    <div class="dp-header">
      <div class="dp-anim-area">
        <canvas id="popup-canvas"></canvas>
        <div class="dp-hero">
          <div class="dp-close" id="dp-close">✕</div>
          <div class="dp-location">${city.name}</div>
          <div class="dp-country">${city.country || ""} · ${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°</div>
          <div class="dp-temp-row">
            <span class="dp-temp ${isWarm ? "warm" : ""}">${tempDisp}°<span style="font-size: 18px; margin-left: -5px;">${settings.tempUnit}</span></span>
            <span class="dp-icon">${wInfo.icon}</span>
          </div>
          <div class="dp-desc">${wInfo.description}</div>
        </div>
      </div>
    </div>
    <div class="dp-body">
      <div class="dp-grid">
        <div class="dp-col-left">
          <div class="dp-stats">
            <div class="dp-stat"><span class="ds-icon">🌡️</span><span class="ds-val">${formatTemp(current.apparent_temperature)}°${settings.tempUnit}</span><span class="ds-lbl">Feels Like</span></div>
            <div class="dp-stat"><span class="ds-icon">💧</span><span class="ds-val">${current.relative_humidity_2m}%</span><span class="ds-lbl">Humidity</span></div>
            <div class="dp-stat"><span class="ds-icon">💨</span><span class="ds-val">${Math.round(current.wind_speed_10m)} km/h</span><span class="ds-lbl">Wind</span></div>
            <div class="dp-stat"><span class="ds-icon">📊</span><span class="ds-val">${Math.round(current.surface_pressure)} hPa</span><span class="ds-lbl">Pressure</span></div>
            <div class="dp-stat"><span class="ds-icon">☁️</span><span class="ds-val">${current.cloud_cover}%</span><span class="ds-lbl">Clouds</span></div>
            <div class="dp-stat"><span class="ds-icon">☀️</span><span class="ds-val">${daily.uv_index_max?.[0]?.toFixed(1) || "—"}</span><span class="ds-lbl">UV Max</span></div>
          </div>
          <div class="dp-sun-row">
            <div class="dp-sun">🌅 ${sunrise}</div>
            <div class="dp-sun">🌇 ${sunset}</div>
          </div>
          <div id="dp-aqi-section"></div>
          <div class="dp-section-title">Daily Trends</div>
          <div class="dp-chart-wrap"><canvas id="popup-daily-chart"></canvas></div>
        </div>
        <div class="dp-col-right">
          <div class="dp-section-title">24h Forecast</div>
          <div class="dp-hourly-scroll">${hourlyHtml}</div>
          <div class="dp-section-title">7-Day</div>
          <div class="dp-daily-list">${dailyHtml}</div>
          <div class="dp-section-title">Hourly Temp</div>
          <div class="dp-chart-wrap"><canvas id="popup-hourly-chart"></canvas></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  detailPanel = panel;
  requestAnimationFrame(() => panel.classList.add("open"));
  const closeBtn = document.getElementById("dp-close");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeDetailPanel();
    };
    closeBtn.ontouchend = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDetailPanel();
    };
  }
  setTimeout(() => {
    const popupCanvas = document.getElementById("popup-canvas");
    const animArea = popupCanvas.parentElement;
    popupCanvas.width = animArea.offsetWidth;
    popupCanvas.height = animArea.offsetHeight;
    if (settings.animations) {
      const popupAnim = new WeatherAnimation(popupCanvas);
      popupAnim.setWeather(wInfo.group, isDay);
    } else {
      const ctx = popupCanvas.getContext("2d");
      ctx.clearRect(0, 0, popupCanvas.width, popupCanvas.height);
    }
    createHourlyChart("popup-hourly-chart", hourly, settings.tempUnit);
    createDailyChart("popup-daily-chart", daily, settings.tempUnit);
  }, 150);
  fetchAirQuality(city.lat, city.lng)
    .then((airData) => {
      if (airData?.current) {
        const aqi = airData.current.us_aqi || 0;
        const level = getAQILevel(aqi);
        const section = document.getElementById("dp-aqi-section");
        if (section) {
          section.innerHTML = `
                <div class="dp-section-title">Air Quality</div>
                <div class="dp-aqi">
                  <div class="dp-aqi-gauge ${level.class}">
                    <span class="dp-aqi-num">${Math.round(aqi)}</span>
                    <span class="dp-aqi-lbl">AQI</span>
                  </div>
                  <div class="dp-aqi-info">
                    <div class="dp-aqi-status" style="color:${level.color}">${level.status}</div>
                    <div class="dp-aqi-detail">PM2.5: ${airData.current.pm2_5?.toFixed(1) || "—"} · PM10: ${airData.current.pm10?.toFixed(1) || "—"}</div>
                  </div>
                </div>`;
        }
      }
    })
    .catch(() => {});
}
function closeDetailPanel() {
  if (detailPanel) {
    detailPanel.classList.remove("open");
    setTimeout(() => {
      detailPanel.remove();
      detailPanel = null;
    }, 350);
  }
}
export { showWeatherPopup, closeDetailPanel };
