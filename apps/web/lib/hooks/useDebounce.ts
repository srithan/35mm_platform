import { useState, useEffect } from "react";

/**
 * Debounces a rapidly-changing value.
 *
 * @param value  The value to debounce.
 * @param delay  Milliseconds to wait before updating. Defaults to 300ms.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
