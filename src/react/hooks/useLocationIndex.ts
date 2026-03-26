/** This file exposes a React hook that talks to the location indexing worker. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LocationEntry, LocationQueryBounds } from "../app/types";

interface PendingRequest {
  resolve: (value: LocationEntry[]) => void;
}

/** This hook initializes the location worker and returns an async viewport query function. */
export function useLocationIndex(): {
  isReady: boolean;
  queryVisibleLocations: (bounds: LocationQueryBounds) => Promise<LocationEntry[]>;
} {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef<Map<number, PendingRequest>>(new Map());

  /** This function queries the worker for visible locations in the current viewport. */
  const queryVisibleLocations = useCallback(
    async (bounds: LocationQueryBounds): Promise<LocationEntry[]> => {
      const worker = workerRef.current;

      if (!worker || !isReady) {
        return [];
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      return new Promise<LocationEntry[]>((resolve) => {
        pendingRequestsRef.current.set(requestId, { resolve });
        worker.postMessage({ type: "query", payload: { requestId, bounds } });
      });
    },
    [isReady],
  );

  useEffect(() => {
    const worker = new Worker(new URL("../features/locations/locations.worker.ts", import.meta.url), {
      type: "module",
    });

    /** This function routes worker responses back to the calling promises. */
    const handleMessage = (
      event: MessageEvent<
        | { type: "ready" }
        | { type: "query-result"; payload: { requestId: number; locations: LocationEntry[] } }
      >,
    ): void => {
      if (event.data.type === "ready") {
        setIsReady(true);
        return;
      }

      const pendingRequest = pendingRequestsRef.current.get(event.data.payload.requestId);

      if (!pendingRequest) {
        return;
      }

      pendingRequestsRef.current.delete(event.data.payload.requestId);
      pendingRequest.resolve(event.data.payload.locations);
    };

    worker.addEventListener("message", handleMessage);
    worker.postMessage({ type: "init", payload: { url: "/data/locations-index.json" } });
    workerRef.current = worker;

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
      workerRef.current = null;
      pendingRequestsRef.current.clear();
    };
  }, []);

  return useMemo(
    () => ({
      isReady,
      queryVisibleLocations,
    }),
    [isReady, queryVisibleLocations],
  );
}
