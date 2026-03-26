/** This file wraps safe localStorage access used by the app. */
/** This function reads and parses JSON from localStorage. */
export function readStorage<T>(key: string): T | null {
  try {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

/** This function writes JSON data to localStorage. */
export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Intentionally ignored to keep the UI resilient.
  }
}

/** This function removes a localStorage item safely. */
export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Intentionally ignored to keep the UI resilient.
  }
}
