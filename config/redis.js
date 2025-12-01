// Redis Configuration for Caching and Session Management
// This is optional - the app will work without Redis, but with Redis it's optimized for 1000+ concurrent users

let redisClient = null;
let redisAvailable = false;

// Try to initialize Redis if available
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const redis = require('redis');
    
    const redisConfig = {
      url: process.env.REDIS_URL,
      socket: process.env.REDIS_HOST ? {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379
      } : undefined,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };

    redisClient = redis.createClient(redisConfig);

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      redisAvailable = true;
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready to accept commands');
      redisAvailable = true;
    });

    // Connect to Redis
    redisClient.connect().catch((err) => {
      console.warn('⚠️ Redis connection failed, continuing without cache:', err.message);
      redisAvailable = false;
    });
  } catch (error) {
    console.warn('⚠️ Redis not installed, continuing without cache. Install with: npm install redis');
    console.warn('💡 For production with 1000+ users, Redis is highly recommended');
    redisAvailable = false;
  }
} else {
  console.log('ℹ️ Redis not configured (REDIS_URL or REDIS_HOST not set)');
  console.log('💡 To enable Redis caching, set REDIS_URL or REDIS_HOST in .env');
}

// Cache helper functions
const cache = {
  // Get cached value
  async get(key) {
    if (!redisAvailable || !redisClient) return null;
    
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  // Set cached value with TTL (time to live in seconds)
  async set(key, value, ttl = 300) {
    if (!redisAvailable || !redisClient) return false;
    
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  },

  // Delete cached value
  async del(key) {
    if (!redisAvailable || !redisClient) return false;
    
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  },

  // Check if Redis is available
  isAvailable() {
    return redisAvailable;
  }
};

// In-memory fallback cache (for when Redis is not available)
const memoryCache = new Map();
const memoryCacheTTL = new Map();

// Memory cache helper
const memoryCacheHelper = {
  get(key) {
    const item = memoryCache.get(key);
    const ttl = memoryCacheTTL.get(key);
    
    if (!item || !ttl) return null;
    if (Date.now() > ttl) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
      return null;
    }
    
    return item;
  },

  set(key, value, ttl = 300) {
    memoryCache.set(key, value);
    memoryCacheTTL.set(key, Date.now() + (ttl * 1000));
    
    // Clean up expired entries periodically
    if (memoryCache.size > 1000) {
      const now = Date.now();
      for (const [k, expiry] of memoryCacheTTL.entries()) {
        if (now > expiry) {
          memoryCache.delete(k);
          memoryCacheTTL.delete(k);
        }
      }
    }
  },

  del(key) {
    memoryCache.delete(key);
    memoryCacheTTL.delete(key);
  }
};

// Unified cache interface (uses Redis if available, falls back to memory)
const unifiedCache = {
  async get(key) {
    if (redisAvailable) {
      return await cache.get(key);
    }
    return memoryCacheHelper.get(key);
  },

  async set(key, value, ttl = 300) {
    if (redisAvailable) {
      return await cache.set(key, value, ttl);
    }
    memoryCacheHelper.set(key, value, ttl);
    return true;
  },

  async del(key) {
    if (redisAvailable) {
      return await cache.del(key);
    }
    memoryCacheHelper.del(key);
    return true;
  },

  isAvailable() {
    return redisAvailable || true; // Memory cache is always available
  }
};

module.exports = {
  redisClient,
  cache: unifiedCache,
  redisAvailable,
  memoryCache: memoryCacheHelper
};

