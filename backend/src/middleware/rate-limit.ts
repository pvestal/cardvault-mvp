/**
 * Rate limiting middleware for API protection
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  middleware(options: RateLimitOptions) {
    const { windowMs, maxRequests, message } = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later',
      ...options,
    };

    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();

      // Get or create request tracking
      let tracking = this.requests.get(key);

      if (!tracking || tracking.resetTime < now) {
        tracking = {
          count: 0,
          resetTime: now + windowMs,
        };
        this.requests.set(key, tracking);
      }

      tracking.count++;

      // Clean up old entries periodically
      if (Math.random() < 0.01) {
        this.cleanup(now);
      }

      // Check rate limit
      if (tracking.count > maxRequests) {
        const retryAfter = Math.ceil((tracking.resetTime - now) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(maxRequests));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(tracking.resetTime));

        return res.status(429).json({
          error: message,
          retryAfter,
        });
      }

      // Add rate limit headers
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', String(maxRequests - tracking.count));
      res.set('X-RateLimit-Reset', String(tracking.resetTime));

      next();
    };
  }

  private cleanup(now: number) {
    for (const [key, tracking] of this.requests.entries()) {
      if (tracking.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Pre-configured rate limiters
export const apiRateLimit = rateLimiter.middleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

export const authRateLimit = rateLimiter.middleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Strict for auth endpoints
  message: 'Too many authentication attempts',
});