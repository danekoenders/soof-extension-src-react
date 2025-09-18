interface ExpiringItem<T> {
  value: T;
  /** Epoch millis when the item expires */
  expiresAt: number;
}

export function setWithExpiry<T>(key: string, value: T, ttlMs: number) {
  try {
    const item: ExpiringItem<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (err) {
    console.error("Failed to set expiring storage", { key, err });
  }
}

export function getWithExpiry<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw) as ExpiringItem<T>;
    if (!item || typeof item.expiresAt !== "number") {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() > item.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (err) {
    console.error("Failed to read expiring storage", { key, err });
    return null;
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to remove expiring storage", { key, err });
  }
}


