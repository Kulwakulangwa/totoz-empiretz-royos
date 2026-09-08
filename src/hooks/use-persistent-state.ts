import { useCallback, useEffect, useState } from "react";

type StorageArea = "local" | "session";

type Options<T> = {
  storage?: StorageArea;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
};

const storageFor = (area: StorageArea) => {
  if (typeof window === "undefined") return null;
  return area === "session" ? window.sessionStorage : window.localStorage;
};

export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
  options: Options<T> = {},
) {
  const {
    storage = "local",
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue;
    const store = storageFor(storage);
    if (!store) return fallback;

    try {
      const stored = store.getItem(key);
      return stored == null ? fallback : deserialize(stored);
    } catch (error) {
      console.warn(`Could not restore persisted state for ${key}`, error);
      return fallback;
    }
  });

  useEffect(() => {
    const store = storageFor(storage);
    if (!store) return;

    try {
      store.setItem(key, serialize(value));
    } catch (error) {
      console.warn(`Could not persist state for ${key}`, error);
    }
  }, [key, serialize, storage, value]);

  const clear = useCallback(() => {
    storageFor(storage)?.removeItem(key);
  }, [key, storage]);

  return [value, setValue, clear] as const;
}
