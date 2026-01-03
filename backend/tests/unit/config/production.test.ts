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
    it('should have database configuration', () => {
      const config = require('../../../src/config/production').productionConfig;
      expect(config.database.connectionString).toBeDefined();
      expect(config.database.max).toBe(20);
    });

    it('should have security configuration', () => {
      const config = require('../../../src/config/production').productionConfig;
      expect(config.security.jwtSecret).toBeDefined();
      expect(config.security.jwtExpiresIn).toBe('7d');
      expect(config.security.bcryptRounds).toBe(12);
      expect(config.security.rateLimitRequests).toBe(100);
    });

    it('should have CORS configuration', () => {
      const config = require('../../../src/config/production').productionConfig;
      expect(config.cors.origin).toBeDefined();
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.maxAge).toBe(86400);
    });

    it('should have session configuration', () => {
      const config = require('../../../src/config/production').productionConfig;
      expect(config.session.secret).toBeDefined();
      expect(config.session.cookie.httpOnly).toBe(true);
      expect(config.session.cookie.sameSite).toBe('strict');
    });

    it('should have logging configuration', () => {
      const config = require('../../../src/config/production').productionConfig;
      expect(config.logging.level).toBeDefined();
      expect(config.logging.format).toBeDefined();
    });

    it('should use different settings for development', () => {
      process.env.NODE_ENV = 'development';

      expect(productionConfig.database.ssl).toBe(false);
      expect(productionConfig.session.cookie.secure).toBe(false);
      expect(productionConfig.logging.format).toBe('pretty');
    });
  });
});