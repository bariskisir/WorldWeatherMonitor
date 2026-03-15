import { fetchWeatherData, searchLocations } from "./weather.js";
import { showWeatherPopup } from "./popup.js";
import { SEARCH_DEBOUNCE, SEARCH_MIN_LENGTH } from "./config.js";

interface IMap {
  on: (event: string, callback: (e?: any) => void) => void;
  flyTo: (latlng: [number, number], zoom: number, options?: any) => void;
}

declare const L: {
  DomEvent: any;
};

let searchTimeout: number;

function initSearch(map: IMap): void {
  const input = document.getElementById("search-input") as HTMLInputElement;
  const results = document.getElementById("search-results") as HTMLElement;

  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (q.length < SEARCH_MIN_LENGTH) {
      results.classList.remove("active");
      return;
    }
    searchTimeout = window.setTimeout(async () => {
      try {
        renderSearchResults(await searchLocations(q), map);
      } catch (e) {
      }
    }, SEARCH_DEBOUNCE);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= SEARCH_MIN_LENGTH)
      results.classList.add("active");
  });

  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest(".search-container"))
      results.classList.remove("active");
  });
}

function renderSearchResults(locations: any[], map: IMap): void {
  const container = document.getElementById("search-results") as HTMLElement;
  const input = document.getElementById("search-input") as HTMLInputElement;

  container.innerHTML = "";

  if (!locations.length) {
    container.innerHTML =
      '<div class="search-result-item"><span class="result-icon">🔍</span><span class="result-info"><span class="result-name">No results</span></span></div>';
    container.classList.add("active");
    return;
  }

  locations.forEach((loc) => {
    const el = document.createElement("div");
    el.className = "search-result-item";
    el.innerHTML = `<span class="result-icon">📍</span><div class="result-info"><div class="result-name">${loc.name}</div><div class="result-detail">${[loc.admin1, loc.country].filter(Boolean).join(", ")}</div></div>`;

    el.addEventListener("click", async () => {
      input.value = loc.name;
      container.classList.remove("active");
      map.flyTo([loc.latitude, loc.longitude], 10, { duration: 1.5 });
      try {
        const data = await fetchWeatherData(loc.latitude, loc.longitude);
        showWeatherPopup(
          {
            name: loc.name,
            lat: loc.latitude,
            lng: loc.longitude,
            country: loc.country || "",
          },
          data,
          map
        );
      } catch (e) {
      }
    });
    container.appendChild(el);
  });
  container.classList.add("active");
}

export { initSearch };
