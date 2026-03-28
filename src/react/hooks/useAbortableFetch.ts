/** This file provides a hook that manages an abortable async fetch tied to a dependency key. */
import { useEffect, useState } from "react";

interface AbortableFetchState<T> {
  data: T | null;
  isLoading: boolean;
}

/** This hook fetches data when the key changes and aborts in-flight requests on cleanup. */
export function useAbortableFetch<T>(
  key: unknown,
  fetcher: ((signal: AbortSignal) => Promise<T>) | null,
): AbortableFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!fetcher) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setData(null);

    fetcher(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key drives refetch
  }, [key]);

  return { data, isLoading };
}
