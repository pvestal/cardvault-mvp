/**
 * Integration tests for SSO authentication endpoints
 * Tests Google OAuth and Apple Sign-In flows
 */

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Pool } from 'pg';
import { setupTestDb, cleanupTestDb, clearTestDb } from '../helpers/testDb';
import authSSORoutes from '../../src/routes/auth-sso';

// Mock passport strategies
jest.mock('passport');
jest.mock('../../src/config/passport');

describe('SSO Authentication Integration Tests', () => {
  let app: express.Application;
  let testPool: Pool;
  let mockAuthenticate: jest.Mock;

  beforeAll(async () => {
    // Setup test database
    testPool = await setupTestDb();

    // Create Express app with session support
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use('/api/auth', authSSORoutes);

    // Mock passport.authenticate
    mockAuthenticate = jest.fn((strategy, options, callback) => {
      return (req: any, res: any, next: any) => {
        if (callback) {
          callback(null, { id: 'test-user', email: 'test@example.com' });
        }
        next();
      };
    });
    (passport.authenticate as jest.Mock) = mockAuthenticate;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    jest.clearAllMocks();
  });

  describe('GET /api/auth/google', () => {
    it('should initiate Google OAuth flow', async () => {
      const response = await request(app)
        .get('/api/auth/google');

      expect(mockAuthenticate).toHaveBeenCalledWith('google', {
        scope: ['profile', 'email']
      });
      expect(response.status).toBe(302); // Redirect to Google
    });

    it('should handle authentication initiation errors', async () => {
      mockAuthenticate.mockImplementationOnce(() => {
        return (req: any, res: any, next: any) => {
          next(new Error('OAuth configuration error'));
        };
      });

      const response = await request(app)
        .get('/api/auth/google');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/auth/google/callback', () => {
    it('should handle successful Google OAuth callback', async () => {
      // Mock successful authentication
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = {
            id: 'google-user-123',
            email: 'googleuser@example.com',
            google_id: 'google123'
          };
          next();
        };
      });

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'auth-code-123' });

      // Should redirect to frontend with token
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/token=/);
      expect(response.headers.location).toContain(process.env.FRONTEND_URL || 'http://localhost:3000');
    });

    it('should handle Google OAuth callback errors', async () => {
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          next(new Error('Invalid authorization code'));
        };
      });

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'invalid-code' });

      // Should redirect with error
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=authentication_failed');
    });

    it('should handle missing user data in callback', async () => {
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = null;
          next();
        };
      });

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'auth-code-456' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=no_user_data');
    });
  });

  describe('GET /api/auth/apple', () => {
    it('should initiate Apple Sign-In flow', async () => {
      const response = await request(app)
        .get('/api/auth/apple');

      expect(mockAuthenticate).toHaveBeenCalledWith('apple');
      expect(response.status).toBe(302);
    });

    it('should handle Apple Sign-In configuration errors', async () => {
      mockAuthenticate.mockImplementationOnce(() => {
        return (req: any, res: any, next: any) => {
          next(new Error('Apple Sign-In not configured'));
        };
      });

      const response = await request(app)
        .get('/api/auth/apple');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/apple/callback', () => {
    it('should handle successful Apple Sign-In callback', async () => {
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = {
            id: 'apple-user-123',
            email: 'appleuser@example.com',
            apple_id: 'apple123'
          };
          next();
        };
      });

      const response = await request(app)
        .post('/api/auth/apple/callback')
        .send({ id_token: 'apple-id-token' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/token=/);
    });

    it('should handle Apple Sign-In errors', async () => {
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          next(new Error('Invalid Apple ID token'));
        };
      });

      const response = await request(app)
        .post('/api/auth/apple/callback')
        .send({ id_token: 'invalid-token' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=authentication_failed');
    });
  });

  describe('SSO Session Management', () => {
    it('should create session after successful SSO login', async () => {
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = {
            id: 'sso-user-123',
            email: 'ssouser@example.com'
          };
          req.session = { userId: 'sso-user-123' };
          next();
        };
      });

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'session-test-code' });

      expect(response.status).toBe(302);
      // Verify session cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle concurrent SSO requests', async () => {
      const ssoRequests = Array(5).fill(null).map((_, index) => {
        mockAuthenticate.mockImplementationOnce((strategy, options) => {
          return (req: any, res: any, next: any) => {
            req.user = {
              id: `concurrent-user-${index}`,
              email: `user${index}@example.com`
            };
            next();
          };
        });

        return request(app)
          .get('/api/auth/google/callback')
          .query({ code: `concurrent-code-${index}` });
      });

      const responses = await Promise.all(ssoRequests);

      responses.forEach(response => {
        expect(response.status).toBe(302);
        expect(response.headers.location).toMatch(/token=/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during SSO', async () => {
      // Mock database error
      const originalQuery = testPool.query;
      testPool.query = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return async (req: any, res: any, next: any) => {
          try {
            await testPool.query('SELECT * FROM users');
          } catch (error) {
            next(error);
          }
        };
      });

      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({ code: 'db-error-code' });

      expect(response.status).toBe(500);

      // Restore original query
      testPool.query = originalQuery;
    });

    it('should handle malformed callback data', async () => {
      const response = await request(app)
        .get('/api/auth/google/callback'); // No code parameter

      expect(response.status).toBe(400);
    });

    it('should validate redirect URLs', async () => {
      mockAuthenticate.mockImplementationOnce((strategy, options) => {
        return (req: any, res: any, next: any) => {
          req.user = { id: 'test', email: 'test@example.com' };
          next();
        };
      });

      // Attempt to inject malicious redirect
      const response = await request(app)
        .get('/api/auth/google/callback')
        .query({
          code: 'test-code',
          state: 'https://evil-site.com'
        });

      // Should redirect to safe default URL
      expect(response.headers.location).not.toContain('evil-site.com');
      expect(response.headers.location).toContain(process.env.FRONTEND_URL || 'localhost');
    });
  });
});