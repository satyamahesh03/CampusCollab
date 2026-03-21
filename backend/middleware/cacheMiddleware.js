const NodeCache = require('node-cache');
// Default TTL of 300 seconds (5 minutes)
const cache = new NodeCache({ stdTTL: 300 });

/**
 * Middleware to cache GET requests
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Generate cache key based on URL and query parameters
    // Include user role/ID in case responses differ by user?
    // Most public/standard GETs for lists can use originalUrl
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      console.log(`Cache hit for: ${key}`);
      return res.json(cachedResponse);
    } else {
      console.log(`Cache miss for: ${key}`);
      const originalJson = res.json;
      
      // Override res.json to store the response in cache before sending
      res.json = (body) => {
        // Only cache successful status codes
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(key, body, duration);
        }
        return originalJson.call(res, body);
      };
      
      next();
    }
  };
};

/**
 * Utility to clear the cache completely or for specific keys
 */
const clearCache = (key) => {
  if (key) {
    const keys = cache.keys();
    keys.forEach(k => {
      if (k.includes(key)) {
        cache.del(k);
      }
    });
  } else {
    cache.flushAll();
  }
};

/**
 * Middleware that automatically invalidates the cache on successful POST, PUT, DELETE requests
 */
const invalidateCacheOnMutation = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      // If the mutation was successful (2xx), clear the global cache
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Mutation successful (${req.method} ${req.originalUrl}), clearing cache...`);
        clearCache();
      }
    });
  }
  next();
};

module.exports = { cacheMiddleware, clearCache, invalidateCacheOnMutation, cache };
