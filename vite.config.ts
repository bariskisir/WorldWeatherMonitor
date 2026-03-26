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
        manualChunks: {
          react: ["react", "react-dom"],
          leaflet: ["leaflet"],
          charts: ["chart.js/auto"],
        },
      },
    },
  },
});
