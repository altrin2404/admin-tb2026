interface RateLimitBucket {
  count: number;
  resetAt: number;
}

// In-memory sliding window bucket store
const rateLimitBuckets = new Map<string, RateLimitBucket>();

// Clean up stale entries every 3 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitBuckets.entries()) {
      if (now > bucket.resetAt) {
        rateLimitBuckets.delete(key);
      }
    }
  }, 3 * 60 * 1000);
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Specific limits tailored for symposium operations
export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  // Login: prevent passcode brute-force (6 attempts per minute)
  auth: { maxRequests: 6, windowMs: 60 * 1000 },
  // Check-in: up to 60 check-ins per minute per station
  checkin: { maxRequests: 60, windowMs: 60 * 1000 },
  // Scan lookup: up to 90 lookups per minute
  scan: { maxRequests: 90, windowMs: 60 * 1000 },
  // New registrations creation: up to 30 per minute
  registration_create: { maxRequests: 30, windowMs: 60 * 1000 },
  // General API protection: 180 requests per minute
  default: { maxRequests: 180, windowMs: 60 * 1000 },
};

/**
 * Maps a request pathname and HTTP method to the appropriate rate limit rule
 */
export function getRateLimitRule(pathname: string, method: string): RateLimitConfig {
  if (pathname.startsWith('/api/auth/login')) {
    return RATE_LIMIT_RULES.auth;
  }
  if (pathname.startsWith('/api/entry/checkin')) {
    return RATE_LIMIT_RULES.checkin;
  }
  if (pathname.startsWith('/api/entry/scan')) {
    return RATE_LIMIT_RULES.scan;
  }
  if (pathname === '/api/registrations' && method === 'POST') {
    return RATE_LIMIT_RULES.registration_create;
  }
  return RATE_LIMIT_RULES.default;
}

/**
 * Checks if the identifier has exceeded the allowed rate
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; limit: number; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      retryAfterSeconds: 0,
    };
  }

  if (bucket.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.count += 1;
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - bucket.count,
    retryAfterSeconds: 0,
  };
}
