import { fetchWeatherData, searchLocations } from "./weather.js";
import { showWeatherPopup } from "./popup.js";
import { SEARCH_DEBOUNCE, SEARCH_MIN_LENGTH } from "./config.js";
let searchTimeout;
function initSearch(map) {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (q.length < SEARCH_MIN_LENGTH) {
      results.classList.remove("active");
      return;
    }
    searchTimeout = setTimeout(async () => {
      try {
        renderSearchResults(await searchLocations(q), map);
      } catch (e) {}
    }, SEARCH_DEBOUNCE);
  });
  input.addEventListener("focus", () => {
    if (input.value.trim().length >= SEARCH_MIN_LENGTH)
      results.classList.add("active");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container"))
      results.classList.remove("active");
  });
}
function renderSearchResults(locations, map) {
  const container = document.getElementById("search-results");
  const input = document.getElementById("search-input");
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
          map,
        );
      } catch (e) {}
    });
    container.appendChild(el);
  });
  container.classList.add("active");
}
export { initSearch };
