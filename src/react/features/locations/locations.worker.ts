/** This file loads the prebuilt location index inside a Web Worker. */
import { getMinimumPriorityForZoom } from "../../app/constants";
import type { LocationEntry, LocationQueryBounds } from "../../app/types";

interface IndexedLocationsPayload {
  gridSize: number;
  spatialHash: Record<string, LocationEntry[]>;
  count: number;
}

type WorkerMessage =
  | { type: "init"; payload: { url: string } }
  | { type: "query"; payload: { requestId: number; bounds: LocationQueryBounds } };

let gridSize = 10;
let spatialHash: Record<string, LocationEntry[]> = {};

/** This function normalizes longitudes into the standard world range. */
function normalizeLongitude(longitude: number): number {
  let normalized = longitude;

  while (normalized < -180) {
    normalized += 360;
  }

  while (normalized > 180) {
    normalized -= 360;
  }

  return normalized;
}

/** This function returns one or two longitude segments for wrapped world bounds. */
function getLongitudeSegments(bounds: LocationQueryBounds): Array<{ west: number; east: number }> {
  const normalizedWest = normalizeLongitude(bounds.west);
  const normalizedEast = normalizeLongitude(bounds.east);

  if (bounds.east - bounds.west >= 360) {
    return [{ west: -180, east: 180 }];
  }

  if (normalizedWest <= normalizedEast) {
    return [{ west: normalizedWest, east: normalizedEast }];
  }

  return [
    { west: normalizedWest, east: 180 },
    { west: -180, east: normalizedEast },
  ];
}

/** This function checks whether a location longitude is inside wrapped bounds. */
function isLongitudeInBounds(longitude: number, bounds: LocationQueryBounds): boolean {
  const normalizedLongitude = normalizeLongitude(longitude);

  return getLongitudeSegments(bounds).some((segment) => {
    return normalizedLongitude >= segment.west && normalizedLongitude <= segment.east;
  });
}

/** This function returns all visible locations for the requested bounds and zoom level. */
function getCitiesInBounds(bounds: LocationQueryBounds): LocationEntry[] {
  const minY = Math.floor(bounds.south / gridSize);
  const maxY = Math.floor(bounds.north / gridSize);
  const visibleLocations: LocationEntry[] = [];
  const longitudeSegments = getLongitudeSegments(bounds);

  for (const segment of longitudeSegments) {
    const minX = Math.floor(segment.west / gridSize);
    const maxX = Math.floor(segment.east / gridSize);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const cell = spatialHash[`${x},${y}`];
        if (!cell) {
          continue;
        }

        for (const location of cell) {
          if (location.priority < getMinimumPriorityForZoom(bounds.zoom)) continue;

          if (
            location.lat >= bounds.south &&
            location.lat <= bounds.north &&
            isLongitudeInBounds(location.lng, bounds)
          ) {
            visibleLocations.push(location);
          }
        }
      }
    }
  }

  return visibleLocations;
}

/** This function sorts and limits visible locations to the active marker count. */
function sortVisibleLocations(locations: LocationEntry[], bounds: LocationQueryBounds): LocationEntry[] {
  const uniqueVisible: LocationEntry[] = [];
  const seen = new Set<string>();

  for (const location of locations) {
    const key = `${location.name}-${location.lat}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVisible.push(location);
    }
  }

  return uniqueVisible
    .map((location) => ({
      ...location,
      distance:
        (location.lat - bounds.centerLat) ** 2 + (location.lng - bounds.centerLng) ** 2,
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority;
      }

      return left.distance - right.distance;
    })
    .slice(0, bounds.limit)
    .map(({ distance: _distance, ...location }) => location);
}

/** This function initializes the worker state from the JSON dataset. */
async function handleInit(url: string): Promise<void> {
  const response = await fetch(url);
  const indexedData = (await response.json()) as IndexedLocationsPayload;
  gridSize = indexedData.gridSize;
  spatialHash = indexedData.spatialHash;
  self.postMessage({ type: "ready", payload: { count: indexedData.count } });
}

/** This function handles all worker messages from the main thread. */
self.onmessage = async (event: MessageEvent<WorkerMessage>): Promise<void> => {
  if (event.data.type === "init") {
    await handleInit(event.data.payload.url);
    return;
  }

  const locations = sortVisibleLocations(
    getCitiesInBounds(event.data.payload.bounds),
    event.data.payload.bounds,
  );

  self.postMessage({
    type: "query-result",
    payload: {
      requestId: event.data.payload.requestId,
      locations,
    },
  });
};
