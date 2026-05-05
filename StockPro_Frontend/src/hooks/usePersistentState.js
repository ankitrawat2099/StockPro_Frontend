import { useEffect, useState } from "react";

export function clearPersistentStore() {
  localStorage.clear();
}

export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to initialValue
      }
    }
    return initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  const clearState = () => {
    setState(initialValue);
    localStorage.removeItem(key);
  };

  return [state, setState, clearState];
}
