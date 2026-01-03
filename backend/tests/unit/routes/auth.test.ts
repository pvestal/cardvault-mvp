/**
 * Unit tests for authentication routes
 */

import request from 'supertest';
import express from 'express';

// Mock dependencies BEFORE importing anything that uses them
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../src/db/connection');

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../../../src/db/connection';

// Import routes after mocking
import authRoutes from '../../../src/routes/auth';

describe('Auth Routes', () => {
  let app: express.Application;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup database connection mock
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
      end: jest.fn()
    });

    // Mount routes
    app.use('/auth', authRoutes);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword123');

      // Mock JWT signing
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      // Setup sequential query responses
      mockQuery
        .mockResolvedValueOnce({
          // First call: check if user exists
          rows: [],
          rowCount: 0
        })
        .mockResolvedValueOnce({
          // Second call: insert user
          rows: [{
            id: 'user-123',
            username: 'testuser'
          }],
          rowCount: 1
        });

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 'user-123',
        username: 'testuser'
      });
      expect(response.body.token).toBe('mock-jwt-token');

      // Verify bcrypt.hash was called with correct parameters
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      // Verify JWT was signed with correct payload
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should reject registration with missing username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password required');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password required');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    it('should reject registration when username already exists', async () => {
      // Mock existing user
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'existinguser',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already exists');
    });

    it('should handle database errors during registration', async () => {
      // Mock database error
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Registration failed');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Mock bcrypt.compare
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock JWT signing
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      // Mock database response
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          password_hash: 'hashedpassword123'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 'user-123',
        username: 'testuser'
      });
      expect(response.body.token).toBe('mock-jwt-token');

      // Verify bcrypt.compare was called correctly
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword123');
    });

    it('should reject login with missing username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password required');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password required');
    });

    it('should reject login with non-existent user', async () => {
      // Mock user not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      // Mock bcrypt.compare to return false
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Mock database response
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          password_hash: 'hashedpassword123'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should handle database errors during login', async () => {
      // Mock database error
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Login failed');
    });

    it('should handle bcrypt errors during login', async () => {
      // Mock bcrypt.compare error
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      // Mock database response
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          username: 'testuser',
          password_hash: 'hashedpassword123'
        }],
        rowCount: 1
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Login failed');
    });
  });
});