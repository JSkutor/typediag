/**
 * Safely parses a value from localStorage.
 * If window/localStorage is undefined (e.g. SSR), or the item is missing, returns defaultValue.
 * If JSON parsing fails, logs the error, clears the corrupt key to prevent repeated failures, and returns defaultValue.
 */
export function safeParseStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined" || !window.localStorage) {
    return defaultValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return defaultValue;
    }
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`[Storage] Failed to parse localStorage key "${key}":`, error);
    // Cleanup corrupt entry to allow recovery on subsequent loads
    try {
      window.localStorage.removeItem(key);
    } catch (removeError) {
      console.error(`[Storage] Failed to clean up corrupt localStorage key "${key}":`, removeError);
    }
    return defaultValue;
  }
}

/**
 * Safely serializes and saves a value to localStorage.
 * Handles SSR env, JSON serialization failures, and StorageQuotaExceeded errors gracefully.
 */
export function safeSetStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`[Storage] Failed to set localStorage key "${key}":`, error);
  }
}
