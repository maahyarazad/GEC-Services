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

module.exports = cacheService;