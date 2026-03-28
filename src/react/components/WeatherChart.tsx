/** This file renders Chart.js canvases used inside the weather popup. */
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import type { ChartOptions } from "chart.js";
import type { AppSettings, WeatherForecast } from "../app/types";
import { convertTemp } from "../app/settings";

interface WeatherChartProps {
  variant: "hourly" | "daily";
  data: WeatherForecast;
  settings: AppSettings;
}

/** This component renders either the hourly or daily weather chart. */
export function WeatherChart({ variant, data, settings }: WeatherChartProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    chartRef.current?.destroy();
    chartRef.current =
      variant === "hourly"
        ? createHourlyChart(canvas, data, settings)
        : createDailyChart(canvas, data, settings);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, settings, variant]);

  return <canvas ref={canvasRef} />;
}

/** This function creates the hourly chart configuration. */
function createHourlyChart(
  canvas: HTMLCanvasElement,
  data: WeatherForecast,
  settings: AppSettings,
): Chart {
  const currentHour = new Date().getHours();
  const times = data.hourly.time.slice(currentHour, currentHour + 24);
  const temps = data.hourly.temperature_2m
    .slice(currentHour, currentHour + 24)
    .map((value) => convertTemp(value, settings));
  const precip =
    data.hourly.precipitation_probability?.slice(currentHour, currentHour + 24) ?? [];

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: times.map(
        (time) => `${new Date(time).getHours().toString().padStart(2, "0")}:00`,
      ),
      datasets: [
        {
          label: `Temperature (°${settings.tempUnit})`,
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
          data: times.map((_time, index) => precip[index] ?? 0),
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
    options: getSharedChartOptions(true),
  });
}

/** This function creates the daily chart configuration. */
function createDailyChart(
  canvas: HTMLCanvasElement,
  data: WeatherForecast,
  settings: AppSettings,
): Chart {
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.daily.time.map((time) =>
        new Date(time).toLocaleDateString("en", { weekday: "short" }),
      ),
      datasets: [
        {
          label: `Max °${settings.tempUnit}`,
          data: data.daily.temperature_2m_max.map((value) => convertTemp(value, settings)),
          backgroundColor: "rgba(251,146,60,0.6)",
          borderColor: "#fb923c",
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
        },
        {
          label: `Min °${settings.tempUnit}`,
          data: data.daily.temperature_2m_min.map((value) => convertTemp(value, settings)),
          backgroundColor: "rgba(56,189,248,0.4)",
          borderColor: "#38bdf8",
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    },
    options: getSharedChartOptions(false),
  });
}

/** This function returns the shared styling for both popup charts. */
function getSharedChartOptions(
  dualAxis: boolean,
): ChartOptions<"line" | "bar"> {
  const scales: ChartOptions<"line" | "bar">["scales"] = {
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
      position: "left" as const,
      ticks: {
        color: dualAxis ? "#38bdf8" : "#64748b",
        font: { family: "Inter", size: 10 },
        callback: (value: string | number) => `${value}°`,
      },
      grid: { color: "rgba(255,255,255,0.04)" },
    },
  };

  if (dualAxis) {
    scales.y1 = {
      position: "right" as const,
      min: 0,
      max: 100,
      ticks: {
        color: "#a78bfa",
        font: { family: "Inter", size: 10 },
        callback: (value: string | number) => `${value}%`,
      },
      grid: { display: false },
    };
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
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
      },
    },
    scales,
  };
}
