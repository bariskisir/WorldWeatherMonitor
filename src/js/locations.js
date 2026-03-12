
let WORLD_CITIES = {};
let locationsLoaded = false;

async function loadLocations() {
  if (locationsLoaded) return;
  try {
    const response = await fetch('js/locations.json');
    WORLD_CITIES = await response.json();
    locationsLoaded = true;
  } catch (error) {
    console.error('Failed to load locations:', error);
  }
}

function getFlattenedCities() {
  const all = [];
  for (const [countryName, countryData] of Object.entries(WORLD_CITIES)) {
    if (countryData.cities) {
      countryData.cities.forEach(state => {
        const isStateCapital = state.iscapital || (state.districts && state.districts.some(d => d.name === state.name && d.iscapital));
        
        const stateObj = { 
          name: state.name, 
          lat: state.lat, 
          lng: state.lng, 
          country: countryName, 
          isCity: true,
          priority: isStateCapital ? 4 : 3,
          isCapital: isStateCapital ? true : false
        };
        all.push(stateObj);
        
        if (state.districts) {
          state.districts.forEach(district => {
            // Skip district if it's the exact same name as the state/province 
            // (we already added the state marker with higher priority above)
            if (district.name === state.name) return;

            const districtObj = { 
              name: district.name, 
              lat: district.lat, 
              lng: district.lng, 
              country: countryName, 
              isCity: true,
              priority: district.iscapital ? 4 : 2
            };
            if (district.iscapital) districtObj.isCapital = true;
            all.push(districtObj);
            
            if (district.subdistricts) {
              district.subdistricts.forEach(sub => {
                const subObj = { 
                  name: sub.name, 
                  lat: sub.lat, 
                  lng: sub.lng, 
                  country: countryName, 
                  isDistrict: true,
                  priority: 1
                };
                all.push(subObj);
              });
            }
          });
        }
      });
    }
  }
  return all;
}

function getCapitalLocations() {
  return getFlattenedCities().filter(c => c.isCapital);
}

function getCityLocations() {
  return getFlattenedCities().filter(c => c.isCity);
}

function getCountryLocations(countryName) {
  const countryData = WORLD_CITIES[countryName];
  if (!countryData || !countryData.cities) return [];
  return countryData.cities.map(c => ({ 
    name: c.name, 
    lat: c.lat, 
    lng: c.lng, 
    country: countryName, 
    isCity: true,
    priority: 3 
  }));
}

let cachedAllLocations = null;
let spatialHash = null;
const GRID_SIZE = 10;

function getAllLocations() {
  if (cachedAllLocations) return cachedAllLocations;
  cachedAllLocations = getFlattenedCities();
  return cachedAllLocations;
}

function getCitiesInBounds(bounds, zoom) {
  if (!spatialHash) {
    const all = getAllLocations();
    spatialHash = {};
    all.forEach((c) => {
      const gx = Math.floor(c.lng / GRID_SIZE);
      const gy = Math.floor(c.lat / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (!spatialHash[key]) spatialHash[key] = [];
      spatialHash[key].push(c);
    });
  }
  const west = bounds.getWest(),
    east = bounds.getEast();
  const south = bounds.getSouth(),
    north = bounds.getNorth();
  const minX = Math.floor(west / GRID_SIZE),
    maxX = Math.floor(east / GRID_SIZE);
  const minY = Math.floor(south / GRID_SIZE),
    maxY = Math.floor(north / GRID_SIZE);
  const results = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const cell = spatialHash[`${x},${y}`];
      if (cell) {
        for (const c of cell) {
          if (zoom < 4 && c.priority < 4) continue;
          if (zoom >= 4 && zoom < 6 && c.priority < 3) continue;
          if (zoom >= 6 && zoom < 10 && c.priority < 2) continue;
          if (c.lat >= south && c.lat <= north && c.lng >= west && c.lng <= east) {
            results.push(c);
          }
        }
      }
    }
  }
  return results;
}

function findNearestCountry(lat, lng) {
  let best = null,
    bestDist = Infinity;
  for (const [countryName, countryData] of Object.entries(WORLD_CITIES)) {
    const d = Math.hypot(countryData.lat - lat, countryData.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = countryName;
    }
  }
  return bestDist < 15 ? best : null;
}

export {
  loadLocations,
  getCapitalLocations,
  getCityLocations,
  getCountryLocations,
  getAllLocations,
  getCitiesInBounds,
  findNearestCountry,
};


