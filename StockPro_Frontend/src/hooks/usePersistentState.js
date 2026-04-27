import { useEffect, useState } from "react";

export function clearPersistentStore() {
  localStorage.clear();
}

function resolveInitialValue(initialValue) {
  return typeof initialValue === "function" ? initialValue() : initialValue;
}

export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    const fallback = resolveInitialValue(initialValue);
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return fallback;
      }
    }

    return fallback;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  function clearState() {
    const fallback = resolveInitialValue(initialValue);
    setState(fallback);
    localStorage.removeItem(key);
  }

  return [state, setState, clearState];
}
