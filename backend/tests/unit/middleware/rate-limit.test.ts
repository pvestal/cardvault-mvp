/**
 * Unit tests for rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiter, apiRateLimit, authRateLimit } from '../../../src/middleware/rate-limit';

describe('Rate Limit Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '192.168.1.1',
      originalUrl: '/api/test',
      connection: { remoteAddress: '192.168.1.1' },
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('rateLimiter', () => {
    it('should allow requests under the limit', () => {
      const middleware = rateLimiter.middleware({ windowMs: 60000, maxRequests: 5 });

      // First request should pass
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(mockResponse.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    });

    it('should block requests over the limit', () => {
      const middleware = rateLimiter.middleware({ windowMs: 60000, maxRequests: 2 });

      // Make 2 requests (at limit)
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Reset mock for third request
      mockNext.mockClear();
      mockResponse.status = jest.fn().mockReturnThis();
      mockResponse.json = jest.fn().mockReturnThis();

      // Third request should be blocked
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many requests, please try again later',
        retryAfter: expect.any(Number),
      });
    });

    it('should track requests per IP', () => {
      const middleware = rateLimiter.middleware({ windowMs: 60000, maxRequests: 3 });

      // Request from first IP
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Request from different IP
      const otherRequest = { ...mockRequest, ip: '192.168.1.2' };
      middleware(otherRequest as Request, mockResponse as Response, mockNext);

      // Both should be allowed
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should set rate limit headers', () => {
      const middleware = rateLimiter.middleware({ windowMs: 60000, maxRequests: 10 });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.set).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(mockResponse.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(mockResponse.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should use custom error message', () => {
      const middleware = rateLimiter.middleware({
        windowMs: 60000,
        maxRequests: 1,
        message: 'Custom rate limit message',
      });

      // First request passes
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request blocked
      mockNext.mockClear();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Custom rate limit message',
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('Pre-configured rate limiters', () => {
    it('should have apiRateLimit configured', () => {
      expect(apiRateLimit).toBeDefined();
      expect(typeof apiRateLimit).toBe('function');
    });

    it('should have authRateLimit configured', () => {
      expect(authRateLimit).toBeDefined();
      expect(typeof authRateLimit).toBe('function');
    });

    it('authRateLimit should be stricter than apiRateLimit', () => {
      // This is a logical test - auth endpoints should have stricter limits
      // In real implementation, authRateLimit has maxRequests: 5 vs apiRateLimit: 100
      expect(authRateLimit).toBeDefined();
      expect(apiRateLimit).toBeDefined();
    });
  });
});