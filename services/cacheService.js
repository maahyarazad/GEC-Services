const COUNT_CACHE_TTL = 5 * 60 * 1000;
const countCache = new Map();

setInterval(() => {
  countCache.clear();
}, COUNT_CACHE_TTL).unref();

const cacheService = {
  countCache, // ✅ exposed

  getCountCacheKey: (start, end) => `${start}__${end}`,

  getCachedTotalCount: (start, end, countStmt) => {
    const key = cacheService.getCountCacheKey(start, end);

    if (countCache.has(key)) {
      return countCache.get(key);
    }

    const countRow = countStmt.get(start, end);
    const totalCount = countRow?.totalCount || 0;

    countCache.set(key, totalCount);
    return totalCount;
  },
};

/**
 * Small size-bounded LRU cache over a Map (insertion order = recency).
 * `ttlMs` > 0 also expires entries that old; 0 means no expiry. `set` can
 * override it per entry: set(key, value, ttlMs).
 * Values are stored as given; callers that hand out mutable objects should copy.
 */
const createLruCache = ({ max, ttlMs = 0 }) => {
  if (!Number.isInteger(max) || max < 1) {
    throw new Error("createLruCache: max must be a positive integer");
  }

  const store = new Map(); // key -> { value, expiresAt }

  const isExpired = (entry) => entry.expiresAt !== 0 && entry.expiresAt <= Date.now();

  const get = (key) => {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (isExpired(entry)) {
      store.delete(key);
      return undefined;
    }
    // Refresh recency.
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  };

  const set = (key, value, entryTtlMs) => {
    const ttl = entryTtlMs ?? ttlMs;
    store.delete(key);
    store.set(key, { value, expiresAt: ttl > 0 ? Date.now() + ttl : 0 });
    while (store.size > max) {
      store.delete(store.keys().next().value); // oldest
    }
  };

  return {
    get,
    set,
    has: (key) => get(key) !== undefined,
    delete: (key) => store.delete(key),
    clear: () => store.clear(),
    size: () => store.size,
  };
};

// Chat history caches (spec 017, research R9). In process; a restart clears them.
// Twilio message body/time by messageSid: immutable, so no TTL.
const twilioMessageCache = createLruCache({ max: 5000 });
// Older history pages (requests with a cursor). Immutable once the cursor pins
// both sources; the TTL only covers rows deleted by hand.
const historyPageCache = createLruCache({ max: 500, ttlMs: 24 * 60 * 60 * 1000 });

// Twilio content template list (research R11). One entry under "all"; cleared on
// create/delete and by the admin Refresh. The TTL covers edits made in the
// Twilio console.
const templateListCache = createLruCache({ max: 1, ttlMs: 10 * 60 * 1000 });
// Insight report results per route + date range (research R12). TTL is set per
// entry: 24 h for ranges entirely in the past, 5 min otherwise.
const insightCache = createLruCache({ max: 200 });

cacheService.createLruCache = createLruCache;
cacheService.templateListCache = templateListCache;
cacheService.insightCache = insightCache;
cacheService.twilioMessageCache = twilioMessageCache;
cacheService.historyPageCache = historyPageCache;

module.exports = cacheService;