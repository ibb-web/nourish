function isCacheStale(doc, ttlMs) {
  if (!doc) return true;
  const last = doc.lastFetchedAt ? new Date(doc.lastFetchedAt).getTime() : 0;
  return Date.now() - last > ttlMs;
}

module.exports = { isCacheStale };
