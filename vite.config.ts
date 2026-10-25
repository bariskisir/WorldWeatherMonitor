/** This file configures Vite for the React and TypeScript weather application. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** This function returns the Vite configuration for local development and production builds. */
export default defineConfig({
  root: "src",
  publicDir: "public",
  plugins: [react()],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react";
          }
          if (id.includes("node_modules/leaflet/")) {
            return "leaflet";
          }
          if (id.includes("node_modules/chart.js/")) {
            return "charts";
          }
        },
      },
    },
  },
});
