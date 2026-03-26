/** This file renders the search input and geocoding results panel. */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { SEARCH_CONFIG } from "../../app/constants";
import type { SearchLocationResult } from "../../app/types";
import { searchLocations } from "../../services/weatherApi";

interface SearchBarProps {
  onOpenSettings: () => void;
  onSelectLocation: (location: SearchLocationResult) => void;
}

export interface SearchBarHandle {
  focus: () => void;
}

/** This component renders the compact search UI shown above the map. */
export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
  { onOpenSettings, onSelectLocation },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipNextSearchRef = useRef(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchLocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  /** This method exposes focus control to the parent component. */
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    if (query.trim().length < SEARCH_CONFIG.minLength) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const nextResults = await searchLocations(query);
        setResults(nextResults);
        setIsOpen(true);
      } catch {
        setResults([]);
        setIsOpen(false);
      }
    }, SEARCH_CONFIG.debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    /** This function closes the search results when the user clicks outside the search area. */
    function handleDocumentClick(event: MouseEvent): void {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  /** This function handles result selection and forwards it to the map scene. */
  function handleSelectLocation(location: SearchLocationResult): void {
    skipNextSearchRef.current = true;
    setQuery(location.name);
    setResults([]);
    setIsOpen(false);
    onSelectLocation(location);
  }

  return (
    <div className="search-container" ref={containerRef}>
      <div className="settings-trigger" id="settings-btn" onClick={onOpenSettings}>
        ⚙️
      </div>
      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          id="search-input"
          placeholder="Search..."
          autoComplete="off"
          value={query}
          onFocus={() => setIsOpen(results.length > 0)}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={`search-results${isOpen ? " active" : ""}`} id="search-results">
        {results.length > 0 ? (
          results.map((result) => (
            <button
              className="search-result-item"
              key={`${result.name}-${result.latitude}-${result.longitude}`}
              type="button"
              onClick={() => handleSelectLocation(result)}
            >
              <span className="result-icon">📍</span>
              <span className="result-info">
                <span className="result-name">{result.name}</span>
                <span className="result-detail">
                  {[result.admin1, result.country].filter(Boolean).join(", ")}
                </span>
              </span>
            </button>
          ))
        ) : query.trim().length >= SEARCH_CONFIG.minLength && isOpen ? (
          <div className="search-result-item">
            <span className="result-icon">🔍</span>
            <span className="result-info">
              <span className="result-name">No results</span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
});
