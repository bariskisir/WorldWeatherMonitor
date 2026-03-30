/** This file renders the Leaflet map and manages viewport-driven weather markers. */
import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import { MAP_CONFIG, UI_CONFIG } from "../../app/constants";
import { loadMapViewport, saveMapViewport } from "../../app/settings";
import type {
  AppSettings,
  LocationEntry,
  SearchLocationResult,
  SelectedLocationWeather,
  WeatherForecast,
} from "../../app/types";
import { fetchWeatherData } from "../../services/weatherApi";
import { useLocationIndex } from "../../hooks/useLocationIndex";
import { MapWeatherOverlay } from "./MapWeatherOverlay";
import {
  createMarkerIcon,
  getLocationKey,
  isLocationAllowedAtZoom,
  sortLocationsForViewport,
} from "./markerUtils";

interface MapSceneProps {
  settings: AppSettings;
  focusRequest: SearchLocationResult | null;
  onFocusRequestHandled: () => void;
  onLoadingChange: (isLoading: boolean) => void;
  onOpenWeatherPopup: (selection: SelectedLocationWeather) => void;
  onRateLimitError: (message: string) => void;
}

interface MarkerRecord extends SelectedLocationWeather {
  marker: L.Marker;
}

/** This component owns the Leaflet map instance and keeps visible markers in sync. */
export function MapScene({
  settings,
  focusRequest,
  onFocusRequestHandled,
  onLoadingChange,
  onOpenWeatherPopup,
  onRateLimitError,
}: MapSceneProps): JSX.Element {
  const { isReady, queryVisibleLocations } = useLocationIndex();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<MapWeatherOverlay | null>(null);
  const markerPoolRef = useRef<L.Marker[]>([]);
  const activeMarkersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const updateVersionRef = useRef(0);
  const desiredMarkerKeysRef = useRef<Set<string>>(new Set());
  const pendingFetchesRef = useRef<Map<string, AbortController>>(new Map());
  const scheduledMarkerRequestsRef = useRef<Map<string, number>>(new Map());
  const updateVisibleMarkersRef = useRef<(() => Promise<void>) | null>(null);
  const syncLoadingStateRef = useRef<(() => void) | null>(null);
  const updatePendingRef = useRef(false);
  const rateLimitBlockedRef = useRef(false);
  const focusFetchControllerRef = useRef<AbortController | null>(null);

  /** This function checks whether an error came from the free-tier rate limit. */
  const isRateLimitError = useCallback((error: unknown): error is Error => {
    return error instanceof Error && error.message.includes("429");
  }, []);

  /** This function clears any delayed marker requests that have not started yet. */
  const cancelScheduledMarkerRequests = useCallback((keys?: Set<string>): void => {
    for (const [key, timeoutId] of scheduledMarkerRequestsRef.current.entries()) {
      if (keys && keys.has(key)) {
        continue;
      }

      window.clearTimeout(timeoutId);
      scheduledMarkerRequestsRef.current.delete(key);
    }
  }, []);

  /** This function aborts all in-flight weather requests and blocks new ones until user interaction. */
  const blockRequestsUntilInteraction = useCallback(
    (message: string): void => {
      if (rateLimitBlockedRef.current) {
        return;
      }

      rateLimitBlockedRef.current = true;
      cancelScheduledMarkerRequests();

      for (const controller of pendingFetchesRef.current.values()) {
        controller.abort();
      }
      pendingFetchesRef.current.clear();

      focusFetchControllerRef.current?.abort();
      focusFetchControllerRef.current = null;
      syncLoadingStateRef.current?.();
      onRateLimitError(message);
    },
    [cancelScheduledMarkerRequests, onRateLimitError],
  );

  /** This function refreshes existing marker icons without dropping their cached weather payloads. */
  const refreshMarkerIcons = useCallback((): void => {
    for (const markerRecord of activeMarkersRef.current.values()) {
      markerRecord.marker.setIcon(createMarkerIcon(markerRecord.city, markerRecord.weather, settings));
    }
  }, [settings]);

  /** This function opens the popup for a selected location and weather combination. */
  const openPopup = useCallback(
    (city: LocationEntry, weather: WeatherForecast): void => {
      onOpenWeatherPopup({ city, weather });
    },
    [onOpenWeatherPopup],
  );

  /** This function adds or reuses a Leaflet marker for the provided weather payload. */
  const addMarker = useCallback(
    (map: L.Map, city: LocationEntry, weather: WeatherForecast): void => {
      const icon = createMarkerIcon(city, weather, settings);
      const markerKey = getLocationKey(city);
      const existingRecord = activeMarkersRef.current.get(markerKey);
      const existingMarker = existingRecord?.marker ?? markerPoolRef.current.pop();
      const marker = existingMarker ?? L.marker([city.lat, city.lng], {
        zIndexOffset: UI_CONFIG.markerZIndexOffset,
      });
      marker.setLatLng([city.lat, city.lng]);
      marker.setIcon(icon);
      marker.off();
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        openPopup(city, weather);
      });
      marker.addTo(map);
      activeMarkersRef.current.set(markerKey, { marker, city, weather });
    },
    [openPopup, settings],
  );

  /** This function updates the loading bar state from the current in-flight request count. */
  const syncLoadingState = useCallback((): void => {
    onLoadingChange(pendingFetchesRef.current.size > 0);
  }, [onLoadingChange]);

  /** This function starts an independent weather request and shows the marker when it resolves. */
  const requestMarkerWeather = useCallback(
    (city: LocationEntry): void => {
      const map = mapRef.current;
      const markerKey = getLocationKey(city);

      if (
        !map ||
        rateLimitBlockedRef.current ||
        activeMarkersRef.current.has(markerKey) ||
        pendingFetchesRef.current.has(markerKey)
      ) {
        return;
      }

      const controller = new AbortController();
      pendingFetchesRef.current.set(markerKey, controller);
      syncLoadingState();

      void fetchWeatherData(city.lat, city.lng, settings, controller.signal)
        .then((weather) => {
          if (!desiredMarkerKeysRef.current.has(markerKey) || controller.signal.aborted) {
            return;
          }

          const liveMap = mapRef.current;

          if (!liveMap) {
            return;
          }

          addMarker(liveMap, city, weather);
        })
        .catch((error) => {
          if (!(error instanceof Error) || controller.signal.aborted) {
            return;
          }

          if (isRateLimitError(error)) {
            blockRequestsUntilInteraction(error.message);
          }
        })
        .finally(() => {
          pendingFetchesRef.current.delete(markerKey);
          syncLoadingState();
        });
    },
    [addMarker, blockRequestsUntilInteraction, isRateLimitError, settings, syncLoadingState],
  );

  /** This function re-evaluates visible cities and syncs the active markers with the current viewport. */
  const updateVisibleMarkers = useCallback(async (): Promise<void> => {
    const map = mapRef.current;

    if (!map || !isReady) {
      return;
    }

    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();
    const version = updateVersionRef.current + 1;
    updateVersionRef.current = version;

    const visibleLocations = await queryVisibleLocations({
      west: bounds.getWest(),
      east: bounds.getEast(),
      south: bounds.getSouth(),
      north: bounds.getNorth(),
      zoom,
      centerLat: center.lat,
      centerLng: center.lng,
      limit: settings.boxCount,
    });

    if (version !== updateVersionRef.current) {
      return;
    }

    const desiredLocations: LocationEntry[] = [];
    const desiredKeys = new Set<string>();

    for (const location of sortLocationsForViewport(
      visibleLocations.filter((candidate) => isLocationAllowedAtZoom(candidate, zoom)),
      center,
    )) {
      const key = getLocationKey(location);

      if (desiredKeys.has(key)) {
        continue;
      }

      desiredLocations.push(location);
      desiredKeys.add(key);

      if (desiredLocations.length >= settings.boxCount) {
        break;
      }
    }

    desiredMarkerKeysRef.current = desiredKeys;
    const keysToRemove: string[] = [];

    for (const [key] of activeMarkersRef.current.entries()) {
      if (!desiredKeys.has(key)) {
        keysToRemove.push(key);
      }
    }

    const citiesToAdd = desiredLocations.filter(
      (location) => {
        const key = getLocationKey(location);
        return (
          !activeMarkersRef.current.has(key) &&
          !scheduledMarkerRequestsRef.current.has(key)
        );
      },
    );

    for (const [key, controller] of pendingFetchesRef.current.entries()) {
      if (!desiredKeys.has(key)) {
        controller.abort();
        pendingFetchesRef.current.delete(key);
      }
    }

    cancelScheduledMarkerRequests(desiredKeys);

    for (const key of keysToRemove) {
      const markerRecord = activeMarkersRef.current.get(key);

      if (!markerRecord) {
        continue;
      }

      map.removeLayer(markerRecord.marker);
      markerPoolRef.current.push(markerRecord.marker);
      activeMarkersRef.current.delete(key);
    }

    if (rateLimitBlockedRef.current) {
      return;
    }

    for (const [index, city] of citiesToAdd.entries()) {
      const markerKey = getLocationKey(city);
      const timeoutId = window.setTimeout(() => {
        scheduledMarkerRequestsRef.current.delete(markerKey);
        requestMarkerWeather(city);
      }, index * 25);
      scheduledMarkerRequestsRef.current.set(markerKey, timeoutId);
    }
  }, [cancelScheduledMarkerRequests, isReady, queryVisibleLocations, requestMarkerWeather, settings.boxCount]);

  useEffect(() => {
    updateVisibleMarkersRef.current = updateVisibleMarkers;
  }, [updateVisibleMarkers]);

  useEffect(() => {
    syncLoadingStateRef.current = syncLoadingState;
  }, [syncLoadingState]);

  useEffect(() => {
    const container = mapContainerRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!container || !overlayCanvas || mapRef.current) {
      return;
    }

    const viewport = loadMapViewport();
    const map = L.map(container, {
      center: viewport?.center ?? MAP_CONFIG.center,
      zoom: viewport?.zoom ?? MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      worldCopyJump: true,
    });

    mapRef.current = map;
    overlayRef.current = new MapWeatherOverlay(overlayCanvas);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.tileAttribution,
      maxZoom: UI_CONFIG.mapTileMaxZoom,
    }).addTo(map);

    /** This function forces Leaflet to recalculate the rendered map dimensions. */
    function syncMapSize(): void {
      map.invalidateSize(false);
    }

    /** This function schedules a pair of size invalidations for unstable mobile viewports. */
    function scheduleMapResize(): void {
      window.requestAnimationFrame(syncMapSize);
      window.setTimeout(syncMapSize, 150);
    }

    /** This function persists viewport changes and refreshes visible markers. */
    function handleMapMove(): void {
      const currentCenter = map.getCenter();
      saveMapViewport({
        center: [currentCenter.lat, currentCenter.lng],
        zoom: map.getZoom(),
      });

      if (updatePendingRef.current) {
        return;
      }

      updatePendingRef.current = true;
      window.requestAnimationFrame(() => {
        updatePendingRef.current = false;
        void updateVisibleMarkersRef.current?.();
      });
    }

    /** This function re-enables network requests after an explicit user map interaction. */
    function resumeRequestsAfterInteraction(): void {
      rateLimitBlockedRef.current = false;
    }

    scheduleMapResize();
    map.on("dragstart", resumeRequestsAfterInteraction);
    map.on("zoomstart", resumeRequestsAfterInteraction);
    map.on("moveend", handleMapMove);
    map.on("zoomend", handleMapMove);
    window.addEventListener("resize", scheduleMapResize);
    window.addEventListener("orientationchange", scheduleMapResize);
    window.visualViewport?.addEventListener("resize", scheduleMapResize);

    return () => {
      map.off("dragstart", resumeRequestsAfterInteraction);
      map.off("zoomstart", resumeRequestsAfterInteraction);
      map.off("moveend", handleMapMove);
      map.off("zoomend", handleMapMove);
      window.removeEventListener("resize", scheduleMapResize);
      window.removeEventListener("orientationchange", scheduleMapResize);
      window.visualViewport?.removeEventListener("resize", scheduleMapResize);
      cancelScheduledMarkerRequests();
      for (const controller of pendingFetchesRef.current.values()) {
        controller.abort();
      }
      pendingFetchesRef.current.clear();
      focusFetchControllerRef.current?.abort();
      focusFetchControllerRef.current = null;
      syncLoadingStateRef.current?.();
      overlayRef.current?.stop();
      map.remove();
      mapRef.current = null;
    };
  }, [cancelScheduledMarkerRequests]);

  useEffect(() => {
    if (!mapRef.current || !isReady) {
      return;
    }

    overlayRef.current?.updateWeather("clear");

    refreshMarkerIcons();
    void updateVisibleMarkers();
  }, [isReady, refreshMarkerIcons, settings, updateVisibleMarkers]);

  useEffect(() => {
    if (!focusRequest || !mapRef.current) {
      return;
    }

    if (rateLimitBlockedRef.current) {
      onFocusRequestHandled();
      return;
    }

    const map = mapRef.current;
    const controller = new AbortController();
    focusFetchControllerRef.current?.abort();
    focusFetchControllerRef.current = controller;
    map.flyTo([focusRequest.latitude, focusRequest.longitude], UI_CONFIG.mapFocusZoom, {
      duration: UI_CONFIG.mapFocusDurationSeconds,
    });

    fetchWeatherData(
      focusRequest.latitude,
      focusRequest.longitude,
      settings,
      controller.signal,
    )
      .then((weather) => {
        if (controller.signal.aborted) {
          return;
        }

        openPopup(
          {
            name: focusRequest.name,
            lat: focusRequest.latitude,
            lng: focusRequest.longitude,
            country: focusRequest.country ?? "",
            isCity: true,
            priority: 4,
          },
          weather,
        );
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        if (isRateLimitError(error)) {
          blockRequestsUntilInteraction(error.message);
        }
      })
      .finally(() => {
        if (focusFetchControllerRef.current === controller) {
          focusFetchControllerRef.current = null;
        }
        onFocusRequestHandled();
      });
  }, [blockRequestsUntilInteraction, focusRequest, isRateLimitError, onFocusRequestHandled, openPopup, settings]);

  return (
    <>
      <div id="map" ref={mapContainerRef}></div>
      <canvas
        id="map-weather-canvas"
        className="map-overlay-canvas"
        ref={overlayCanvasRef}
      ></canvas>
    </>
  );
}
