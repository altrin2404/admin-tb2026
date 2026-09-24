// Fast in-memory cache to eliminate redundant Supabase round-trips
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

declare global {
  var _cacheStore: Map<string, CacheEntry<unknown>> | undefined;
}

const cacheStore = global._cacheStore || new Map<string, CacheEntry<unknown>>();

if (process.env.NODE_ENV !== 'production') {
  global._cacheStore = cacheStore;
}

export function getCached<T>(key: string, ttlMs: number = 6000): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  cacheStore.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
