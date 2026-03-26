/** This file precomputes the locations spatial index before dev/build runs. */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GRID_SIZE = 10;
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const sourceDirectory = resolve(projectRoot, "data", "locations");
const outputPath = resolve(projectRoot, "public", "data", "locations-index.json");

/** This function loads all country definition files from the locations directory. */
async function loadCountryFiles() {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const countries = [];

  for (const fileName of files) {
    const filePath = resolve(sourceDirectory, fileName);
    const rawCountry = await readFile(filePath, "utf8");
    const country = JSON.parse(rawCountry);

    if (!country?.name || !Array.isArray(country.cities)) {
      throw new Error(`Invalid country data in ${fileName}`);
    }

    countries.push(country);
  }

  return countries;
}

/** This function converts the nested source dataset into flat marker entries. */
function flattenLocations(source) {
  const allLocations = [];

  for (const countryData of source) {
    for (const state of countryData.cities ?? []) {
      const isStateCapital =
        state.iscapital ||
        state.districts?.some((district) => district.name === state.name && district.iscapital);

      allLocations.push({
        name: state.name,
        lat: state.lat,
        lng: state.lng,
        country: countryData.name,
        isCity: true,
        isCapital: Boolean(isStateCapital),
        priority: isStateCapital ? 4 : 3,
      });

      for (const district of state.districts ?? []) {
        if (district.name === state.name) {
          continue;
        }

        allLocations.push({
          name: district.name,
          lat: district.lat,
          lng: district.lng,
          country: countryData.name,
          isCity: true,
          isCapital: Boolean(district.iscapital),
          priority: district.iscapital ? 4 : 2,
        });

        for (const subdistrict of district.subdistricts ?? []) {
          allLocations.push({
            name: subdistrict.name,
            lat: subdistrict.lat,
            lng: subdistrict.lng,
            country: countryData.name,
            isDistrict: true,
            priority: 1,
          });
        }
      }
    }
  }

  return allLocations;
}

/** This function builds a coarse spatial hash for fast viewport queries. */
function buildSpatialHash(locations) {
  const spatialHash = {};

  for (const location of locations) {
    const gridX = Math.floor(location.lng / GRID_SIZE);
    const gridY = Math.floor(location.lat / GRID_SIZE);
    const key = `${gridX},${gridY}`;
    spatialHash[key] ??= [];
    spatialHash[key].push(location);
  }

  return spatialHash;
}

/** This function generates the serialized spatial index file. */
async function buildLocationIndex() {
  const sourceData = await loadCountryFiles();
  const flattenedLocations = flattenLocations(sourceData);
  const indexedPayload = {
    gridSize: GRID_SIZE,
    spatialHash: buildSpatialHash(flattenedLocations),
    count: flattenedLocations.length,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(indexedPayload));
  console.log(
    `WorldWeatherMonitor location index generated: ${flattenedLocations.length} entries`,
  );
}

await buildLocationIndex();
