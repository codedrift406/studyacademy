// Simple in-memory cache for API responses (Phase 5 Performance)
const cache = new Map<string, { value: any; expiresAt: number }>();

export const getCache = (key: string) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

export const setCache = (key: string, value: any, ttlSeconds: number = 60) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

export const clearCache = (prefix: string) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};
