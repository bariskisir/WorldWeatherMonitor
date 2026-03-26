/** This file boots the React application and loads the global styles. */
import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles/global.css";
import "./styles/app-shell.css";
import "./styles/popup.css";
import { App } from "./ui/App";

/** This function renders the root React application into the DOM. */
function renderApplication(): void {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element was not found.");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

renderApplication();
