/**
 * Unit tests for Passport authentication configuration
 * Tests Google OAuth and Apple Sign-In strategies
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Pool } from 'pg';
import '../../src/config/passport';

// Mock dependencies
jest.mock('passport-google-oauth20');
jest.mock('passport-apple');
jest.mock('pg');

describe('Passport Configuration Tests', () => {
  let mockPool: jest.Mocked<Pool>;
  let googleStrategyCallback: Function;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture Google Strategy callback
    (GoogleStrategy as jest.Mock).mockImplementation((options, callback) => {
      googleStrategyCallback = callback;
      return {};
    });

    // Mock database pool
    mockPool = {
      query: jest.fn()
    } as any;
  });

  describe('Google OAuth Strategy', () => {
    it('should configure Google OAuth with correct parameters', () => {
      expect(GoogleStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientID: expect.any(String),
          clientSecret: expect.any(String),
          callbackURL: expect.stringContaining('/api/auth/google/callback'),
          scope: expect.arrayContaining(['profile', 'email'])
        }),
        expect.any(Function)
      );
    });

    it('should create new user if not exists on Google login', async () => {
      const mockProfile = {
        id: 'google123',
        emails: [{ value: 'test@example.com', verified: true }],
        displayName: 'Test User',
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({
          rows: [{
            id: 'uuid123',
            google_id: 'google123',
            email: 'test@example.com',
            username: 'test@example.com',
            created_at: new Date()
          }]
        }); // Created user

      const done = jest.fn();
      await googleStrategyCallback('accessToken', 'refreshToken', mockProfile, done);

      // Verify user creation query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['google123', 'test@example.com'])
      );

      expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
        id: 'uuid123',
        email: 'test@example.com'
      }));
    });

    it('should return existing user on Google login', async () => {
      const mockProfile = {
        id: 'google456',
        emails: [{ value: 'existing@example.com', verified: true }],
        displayName: 'Existing User'
      };

      const existingUser = {
        id: 'uuid456',
        google_id: 'google456',
        email: 'existing@example.com',
        username: 'existing@example.com',
        created_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [existingUser] });

      const done = jest.fn();
      await googleStrategyCallback('accessToken', 'refreshToken', mockProfile, done);

      // Should only query once to find existing user
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(done).toHaveBeenCalledWith(null, existingUser);
    });

    it('should handle Google OAuth errors gracefully', async () => {
      const mockProfile = {
        id: 'google789',
        emails: [{ value: 'error@example.com', verified: true }]
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const done = jest.fn();
      await googleStrategyCallback('accessToken', 'refreshToken', mockProfile, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject unverified email addresses', async () => {
      const mockProfile = {
        id: 'google999',
        emails: [{ value: 'unverified@example.com', verified: false }]
      };

      const done = jest.fn();
      await googleStrategyCallback('accessToken', 'refreshToken', mockProfile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('email')
        })
      );
    });
  });

  describe('User Serialization', () => {
    it('should serialize user to session', () => {
      const user = { id: 'user123', email: 'test@example.com' };
      const done = jest.fn();

      passport.serializeUser(user, done);
      expect(done).toHaveBeenCalledWith(null, 'user123');
    });

    it('should deserialize user from session', async () => {
      const userId = 'user456';
      const user = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [user] });

      const done = jest.fn();
      await passport.deserializeUser(userId, done);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );
      expect(done).toHaveBeenCalledWith(null, user);
    });

    it('should handle deserialization errors', async () => {
      const userId = 'invalid';
      mockPool.query.mockRejectedValueOnce(new Error('User not found'));

      const done = jest.fn();
      await passport.deserializeUser(userId, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Apple Sign-In Strategy', () => {
    it('should configure Apple Sign-In strategy when credentials present', () => {
      process.env.APPLE_CLIENT_ID = 'com.example.app';
      process.env.APPLE_TEAM_ID = 'TEAM123';
      process.env.APPLE_KEY_ID = 'KEY123';
      process.env.APPLE_PRIVATE_KEY = 'privatekey';

      // Re-import to apply environment variables
      jest.resetModules();
      require('../../src/config/passport');

      expect(passport.use).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'apple'
        })
      );
    });

    it('should skip Apple Sign-In if credentials missing', () => {
      delete process.env.APPLE_CLIENT_ID;

      jest.resetModules();
      require('../../src/config/passport');

      const appleCalls = (passport.use as jest.Mock).mock.calls.filter(
        call => call[0]?.name === 'apple'
      );
      expect(appleCalls).toHaveLength(0);
    });
  });
});