/**
 * Integration tests for authentication API endpoints
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { setupTestDb, cleanupTestDb, clearTestDb } from '../helpers/testDb';
import { setPool } from '../../src/db/connection';
import authRoutes from '../../src/routes/auth';

describe('Auth Integration Tests', () => {
  let app: express.Application;
  let testPool: Pool;

  beforeAll(async () => {
    // Setup test database
    testPool = await setupTestDb();

    // Inject test pool into connection module
    setPool(testPool);

    // Create Express app identical to main app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return user data with token', async () => {
      const userData = {
        username: 'integrationuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('integrationuser');
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(typeof response.body.token).toBe('string');

      // Verify user was actually created in database
      const dbUser = await testPool.query(
        'SELECT id, username FROM users WHERE username = $1',
        ['integrationuser']
      );
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].username).toBe('integrationuser');
    });

    it('should prevent duplicate user registration', async () => {
      const userData = {
        username: 'duplicateuser',
        password: 'password123'
      };

      // First registration should succeed
      const firstResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      expect(firstResponse.status).toBe(201);

      // Second registration should fail
      const secondResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);
      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toBe('Username already exists');
    });

    it('should validate password length requirements', async () => {
      const userData = {
        username: 'shortpass',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters');

      // Verify no user was created
      const dbUser = await testPool.query(
        'SELECT id FROM users WHERE username = $1',
        ['shortpass']
      );
      expect(dbUser.rows).toHaveLength(0);
    });

    it('should hash passwords securely', async () => {
      const userData = {
        username: 'secureuser',
        password: 'mySecretPassword123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);
      expect(response.status).toBe(201);

      // Verify password is hashed in database
      const dbUser = await testPool.query(
        'SELECT password_hash FROM users WHERE username = $1',
        ['secureuser']
      );
      expect(dbUser.rows[0].password_hash).not.toBe('mySecretPassword123');
      expect(dbUser.rows[0].password_hash).toMatch(/^\\$2[ab]\\$10\\$/); // bcrypt format
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'loginuser',
          password: 'password123'
        });
    });

    it('should login existing user with correct credentials', async () => {
      const loginData = {
        username: 'loginuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('loginuser');
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        username: 'loginuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should reject login with non-existent username', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should validate required fields', async () => {
      // Missing username
      const missingUsername = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });
      expect(missingUsername.status).toBe(400);
      expect(missingUsername.body.error).toBe('Username and password required');

      // Missing password
      const missingPassword = await request(app)
        .post('/api/auth/login')
        .send({ username: 'loginuser' });
      expect(missingPassword.status).toBe(400);
      expect(missingPassword.body.error).toBe('Username and password required');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration and login flow', async () => {
      const userData = {
        username: 'fullflowuser',
        password: 'testPassword456'
      };

      // 1. Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const registeredUserId = registerResponse.body.user.id;
      const registrationToken = registerResponse.body.token;

      // 2. Login with same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.user.id).toBe(registeredUserId);
      expect(loginResponse.body.user.username).toBe('fullflowuser');

      // Token should be different (new expiration)
      expect(loginResponse.body.token).not.toBe(registrationToken);
      expect(typeof loginResponse.body.token).toBe('string');
    });

    it('should handle multiple concurrent registrations', async () => {
      const users = [
        { username: 'concurrent1', password: 'password123' },
        { username: 'concurrent2', password: 'password123' },
        { username: 'concurrent3', password: 'password123' }
      ];

      // Register all users concurrently
      const promises = users.map(user =>
        request(app).post('/api/auth/register').send(user)
      );

      const responses = await Promise.all(promises);

      // All registrations should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.user.username).toBe(users[index].username);
      });

      // Verify all users exist in database
      const dbUsers = await testPool.query('SELECT username FROM users ORDER BY username');
      expect(dbUsers.rows).toHaveLength(3);
      expect(dbUsers.rows.map(u => u.username)).toEqual([
        'concurrent1',
        'concurrent2',
        'concurrent3'
      ]);
    });
  });
});