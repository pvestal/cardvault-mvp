/**
 * Simplified integration tests for auth routes
 * Mocks database at the function level, not PostgreSQL level
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock the database connection module
jest.mock('../../src/db/connection', () => ({
  getPool: jest.fn(),
  setPool: jest.fn(),
  closePool: jest.fn()
}));

// Import after mocking
import authRoutes from '../../src/routes/auth';
import { getPool } from '../../src/db/connection';

describe('Auth Routes - Simplified Tests', () => {
  let app: express.Application;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock query function
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery
    });

    // Create Express app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock the two queries: check existence, then insert
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // User doesn't exist
        .mockResolvedValueOnce({
          rows: [{ id: 'user-123', username: 'testuser' }],
          rowCount: 1
        }); // Insert successful

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 'user-123',
        username: 'testuser'
      });
    });

    it('should handle duplicate username', async () => {
      // Mock user already exists
      mockQuery.mockResolvedValue({
        rows: [{ id: 'existing-user' }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'existing', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already exists');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Mock finding user
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          password_hash: hashedPassword
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 'user-123',
        username: 'testuser'
      });
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockQuery.mockResolvedValue({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          password_hash: hashedPassword
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nouser', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});