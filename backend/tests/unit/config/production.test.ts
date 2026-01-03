/**
 * Unit tests for production configuration
 */

import { validateEnvironment, productionConfig } from '../../../src/config/production';

describe('Production Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should validate all required environment variables', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      process.env.SESSION_SECRET = 'session-secret';
      process.env.FRONTEND_URL = 'http://localhost:3000';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw error for missing environment variables', () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      expect(() => validateEnvironment()).toThrow('Missing required environment variables: DATABASE_URL, JWT_SECRET');
    });

    it('should validate encryption key length', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.ENCRYPTION_KEY = 'too-short';
      process.env.SESSION_SECRET = 'session-secret';
      process.env.FRONTEND_URL = 'http://localhost:3000';

      expect(() => validateEnvironment()).toThrow('ENCRYPTION_KEY must be 64 characters');
    });
  });

  describe('productionConfig', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.SESSION_SECRET = 'session-secret';
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.NODE_ENV = 'production';
    });

    it('should have database configuration', () => {
      expect(productionConfig.database.connectionString).toBe('postgresql://localhost/test');
      expect(productionConfig.database.max).toBe(20);
      expect(productionConfig.database.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('should have security configuration', () => {
      expect(productionConfig.security.jwtSecret).toBe('test-secret');
      expect(productionConfig.security.jwtExpiresIn).toBe('7d');
      expect(productionConfig.security.bcryptRounds).toBe(12);
      expect(productionConfig.security.rateLimitRequests).toBe(100);
    });

    it('should have CORS configuration', () => {
      expect(productionConfig.cors.origin).toBe('https://example.com');
      expect(productionConfig.cors.credentials).toBe(true);
      expect(productionConfig.cors.maxAge).toBe(86400);
    });

    it('should have session configuration', () => {
      expect(productionConfig.session.secret).toBe('session-secret');
      expect(productionConfig.session.cookie.secure).toBe(true);
      expect(productionConfig.session.cookie.httpOnly).toBe(true);
      expect(productionConfig.session.cookie.sameSite).toBe('strict');
    });

    it('should have logging configuration', () => {
      expect(productionConfig.logging.level).toBe('info');
      expect(productionConfig.logging.format).toBe('json');
    });

    it('should use different settings for development', () => {
      process.env.NODE_ENV = 'development';

      expect(productionConfig.database.ssl).toBe(false);
      expect(productionConfig.session.cookie.secure).toBe(false);
      expect(productionConfig.logging.format).toBe('pretty');
    });
  });
});