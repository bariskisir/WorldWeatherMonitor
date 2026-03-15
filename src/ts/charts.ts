import { convertTemp } from "./settings.js";

let hourlyChart: any = null;
let dailyChart: any = null;

function createHourlyChart(
  canvas: HTMLCanvasElement,
  hourlyData: any,
  tempUnit: string = "C"
): void {
  if (!canvas || !hourlyData || !hourlyData.time || !hourlyData.temperature_2m)
    return;

  const ChartLib = (window as any).Chart;
  if (!ChartLib) return;

  if (hourlyChart) hourlyChart.destroy();

  const now = new Date();
  const currentHour = now.getHours();

  if (hourlyData.time.length < currentHour) return;

  const times = hourlyData.time.slice(currentHour, currentHour + 24);
  const temps = (hourlyData.temperature_2m || [])
    .slice(currentHour, currentHour + 24)
    .map((t: number) => convertTemp(t));
  const precipRaw = (hourlyData.precipitation_probability || []).slice(
    currentHour,
    currentHour + 24
  );

  const precip = times.map((_: any, i: number) => precipRaw[i] ?? 0);

  const labels = times.map((t: string) => {
    const d = new Date(t);
    return d.getHours().toString().padStart(2, "0") + ":00";
  });

  hourlyChart = new ChartLib(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Temperature (°${tempUnit})`,
          data: temps,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: "#38bdf8",
          borderWidth: 2,
          yAxisID: "y",
        },
        {
          label: "Precip. Prob. (%)",
          data: precip,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167,139,250,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
          borderDash: [4, 4],
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: {
            color: "#94a3b8",
            font: { family: "Inter", size: 11 },
            boxWidth: 12,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: "rgba(17,24,39,0.9)",
          titleColor: "#f1f5f9",
          bodyColor: "#94a3b8",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "Inter", weight: "600" },
          bodyFont: { family: "Inter" },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#64748b",
            font: { family: "Inter", size: 10 },
            maxRotation: 0,
            maxTicksLimit: 8,
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          position: "left",
          ticks: {
            color: "#38bdf8",
            font: { family: "Inter", size: 10 },
            callback: (v: any) => v + "°",
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y1: {
          position: "right",
          min: 0,
          max: 100,
          ticks: {
            color: "#a78bfa",
            font: { family: "Inter", size: 10 },
            callback: (v: any) => v + "%",
          },
          grid: { display: false },
        },
      },
    },
  });
}

function createDailyChart(
  canvas: HTMLCanvasElement,
  dailyData: any,
  tempUnit: string = "C"
): void {
  if (!canvas || !dailyData || !dailyData.time || !dailyData.temperature_2m_max)
    return;

  const ChartLib = (window as any).Chart;
  if (!ChartLib) return;

  if (dailyChart) dailyChart.destroy();

  const labels = dailyData.time.map((t: string) => {
    const d = new Date(t);
    return d.toLocaleDateString("en", { weekday: "short" });
  });

  dailyChart = new ChartLib(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: `Max °${tempUnit}`,
          data: dailyData.temperature_2m_max.map((t: number) => convertTemp(t)),
          backgroundColor: "rgba(251,146,60,0.6)",
          borderColor: "#fb923c",
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
        },
        {
          label: `Min °${tempUnit}`,
          data: dailyData.temperature_2m_min.map((t: number) => convertTemp(t)),
          backgroundColor: "rgba(56,189,248,0.4)",
          borderColor: "#38bdf8",
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#94a3b8",
            font: { family: "Inter", size: 11 },
            boxWidth: 12,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: "rgba(17,24,39,0.9)",
          titleColor: "#f1f5f9",
          bodyColor: "#94a3b8",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "Inter", weight: "600" },
          bodyFont: { family: "Inter" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#64748b", font: { family: "Inter", size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#64748b",
            font: { family: "Inter", size: 10 },
            callback: (v: any) => v + "°",
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
    },
  });
}

export { createHourlyChart, createDailyChart };
