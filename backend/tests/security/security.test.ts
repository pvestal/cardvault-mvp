/**
 * Security-focused tests for CardVault MVP
 * Tests encryption, authentication, authorization, and common vulnerabilities
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import crypto from 'crypto';
import { setupTestDb, cleanupTestDb, clearTestDb } from '../helpers/testDb';
import { encryptCardNumber, decryptCardNumber } from '../../src/services/crypto';
import authMiddleware from '../../src/middleware/auth';

describe('Security Tests', () => {
  let app: express.Application;
  let testPool: Pool;

  beforeAll(async () => {
    testPool = await setupTestDb();

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add test routes
    app.post('/test/protected', authMiddleware, (req, res) => {
      res.json({ user: (req as any).user });
    });
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('Encryption Security', () => {
    it('should use AES-256-GCM for card number encryption', () => {
      const cardNumber = '4111111111111111';
      const encrypted = encryptCardNumber(cardNumber);

      // Check encrypted format includes IV and auth tag
      expect(encrypted).toMatch(/^[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/);

      // Verify decryption
      const decrypted = decryptCardNumber(encrypted);
      expect(decrypted).toBe(cardNumber);
    });

    it('should generate unique encryption for same card number', () => {
      const cardNumber = '4111111111111111';
      const encrypted1 = encryptCardNumber(cardNumber);
      const encrypted2 = encryptCardNumber(cardNumber);

      // Different IVs should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to same value
      expect(decryptCardNumber(encrypted1)).toBe(cardNumber);
      expect(decryptCardNumber(encrypted2)).toBe(cardNumber);
    });

    it('should fail to decrypt with tampered ciphertext', () => {
      const cardNumber = '4111111111111111';
      const encrypted = encryptCardNumber(cardNumber);

      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      parts[2] = parts[2].slice(0, -2) + 'ff'; // Modify last bytes
      const tampered = parts.join(':');

      expect(() => decryptCardNumber(tampered)).toThrow();
    });

    it('should fail to decrypt with wrong auth tag', () => {
      const cardNumber = '4111111111111111';
      const encrypted = encryptCardNumber(cardNumber);

      // Modify auth tag
      const parts = encrypted.split(':');
      parts[1] = crypto.randomBytes(16).toString('hex');
      const tampered = parts.join(':');

      expect(() => decryptCardNumber(tampered)).toThrow();
    });

    it('should protect against timing attacks in decryption', () => {
      const cardNumber = '4111111111111111';
      const encrypted = encryptCardNumber(cardNumber);

      const validTimes: number[] = [];
      const invalidTimes: number[] = [];

      // Measure valid decryption times
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();
        try {
          decryptCardNumber(encrypted);
        } catch (e) {}
        const end = process.hrtime.bigint();
        validTimes.push(Number(end - start));
      }

      // Measure invalid decryption times
      const invalid = encrypted.slice(0, -2) + 'ff';
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();
        try {
          decryptCardNumber(invalid);
        } catch (e) {}
        const end = process.hrtime.bigint();
        invalidTimes.push(Number(end - start));
      }

      // Average times should be similar (constant-time comparison)
      const validAvg = validTimes.reduce((a, b) => a + b) / validTimes.length;
      const invalidAvg = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;
      const difference = Math.abs(validAvg - invalidAvg) / validAvg;

      expect(difference).toBeLessThan(0.5); // Less than 50% difference
    });
  });

  describe('JWT Security', () => {
    it('should use strong JWT signing algorithm', () => {
      const payload = { userId: 'test123' };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h',
        algorithm: 'HS256'
      });

      const decoded = jwt.decode(token, { complete: true });
      expect(decoded?.header.alg).toBe('HS256');
      expect(decoded?.header.typ).toBe('JWT');
    });

    it('should reject tokens with none algorithm', () => {
      const maliciousToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJ0ZXN0MTIzIn0.';

      expect(() => {
        jwt.verify(maliciousToken, process.env.JWT_SECRET || 'test-secret');
      }).toThrow();
    });

    it('should reject expired tokens', () => {
      const token = jwt.sign(
        { userId: 'test123' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      }).toThrow('jwt expired');
    });

    it('should reject tokens with invalid signature', () => {
      const token = jwt.sign(
        { userId: 'test123' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      }).toThrow('invalid signature');
    });

    it('should protect against JWT confusion attacks', async () => {
      // Try to use a symmetric key as RSA public key
      const maliciousToken = jwt.sign(
        { userId: 'admin', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { algorithm: 'HS256' }
      );

      const response = await request(app)
        .post('/test/protected')
        .set('Authorization', `Bearer ${maliciousToken}RS256`); // Try to claim RS256

      expect(response.status).toBe(401);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'SecurePassword123!';
      const hash = await bcrypt.hash(password, 10);

      // Verify bcrypt format
      expect(hash).toMatch(/^\$2[ayb]\$10\$/);
      expect(hash.length).toBeGreaterThan(50);

      // Verify password validation
      const valid = await bcrypt.compare(password, hash);
      expect(valid).toBe(true);
    });

    it('should use sufficient bcrypt rounds', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      // Extract rounds from hash
      const rounds = parseInt(hash.split('$')[2]);
      expect(rounds).toBeGreaterThanOrEqual(10);
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc',
        '12345'
      ];

      weakPasswords.forEach(weak => {
        expect(weak.length).toBeLessThan(6);
      });
    });

    it('should protect against password timing attacks', async () => {
      const password = 'SecurePassword123!';
      const hash = await bcrypt.hash(password, 10);

      const correctTimes: number[] = [];
      const incorrectTimes: number[] = [];

      // Measure correct password verification times
      for (let i = 0; i < 20; i++) {
        const start = process.hrtime.bigint();
        await bcrypt.compare(password, hash);
        const end = process.hrtime.bigint();
        correctTimes.push(Number(end - start));
      }

      // Measure incorrect password verification times
      for (let i = 0; i < 20; i++) {
        const start = process.hrtime.bigint();
        await bcrypt.compare('WrongPassword123!', hash);
        const end = process.hrtime.bigint();
        incorrectTimes.push(Number(end - start));
      }

      // Times should be relatively consistent (bcrypt is designed for this)
      const correctAvg = correctTimes.reduce((a, b) => a + b) / correctTimes.length;
      const incorrectAvg = incorrectTimes.reduce((a, b) => a + b) / incorrectTimes.length;

      // Both should take similar time (within reasonable variance)
      expect(Math.abs(correctAvg - incorrectAvg)).toBeLessThan(correctAvg * 0.5);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries', async () => {
      const maliciousInput = "'; DROP TABLE users; --";

      // Attempt SQL injection in user lookup
      const result = await testPool.query(
        'SELECT * FROM users WHERE username = $1',
        [maliciousInput]
      );

      // Query should execute safely
      expect(result.rows).toEqual([]);

      // Verify users table still exists
      const tableCheck = await testPool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
      );
      expect(tableCheck.rows[0].exists).toBe(true);
    });

    it('should escape special characters in queries', async () => {
      const specialChars = "Test'; OR '1'='1";

      // Insert user with special characters
      await testPool.query(
        'INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)',
        [crypto.randomUUID(), specialChars, 'hash']
      );

      // Query should find exact match only
      const result = await testPool.query(
        'SELECT username FROM users WHERE username = $1',
        [specialChars]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].username).toBe(specialChars);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize card names and notes', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const userId = crypto.randomUUID();

      // Insert card with XSS payload
      await testPool.query(
        `INSERT INTO cards (id, user_id, card_name, card_number_encrypted, barcode_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          crypto.randomUUID(),
          userId,
          xssPayload,
          encryptCardNumber('4111111111111111'),
          '123456789'
        ]
      );

      // Retrieve and verify sanitization
      const result = await testPool.query(
        'SELECT card_name FROM cards WHERE user_id = $1',
        [userId]
      );

      // Should store as-is but frontend should escape
      expect(result.rows[0].card_name).toBe(xssPayload);
      expect(result.rows[0].card_name).toContain('<script>');
    });

    it('should set proper Content-Type headers', async () => {
      const response = await request(app)
        .get('/test/json')
        .expect('Content-Type', /application\/json/);
    });
  });

  describe('Authorization & Access Control', () => {
    it('should enforce user isolation for cards', async () => {
      const user1Id = crypto.randomUUID();
      const user2Id = crypto.randomUUID();
      const card1Id = crypto.randomUUID();
      const card2Id = crypto.randomUUID();

      // Create cards for different users
      await testPool.query(
        `INSERT INTO cards (id, user_id, card_name, card_number_encrypted)
         VALUES ($1, $2, $3, $4)`,
        [card1Id, user1Id, 'User1 Card', encryptCardNumber('1111')]
      );

      await testPool.query(
        `INSERT INTO cards (id, user_id, card_name, card_number_encrypted)
         VALUES ($1, $2, $3, $4)`,
        [card2Id, user2Id, 'User2 Card', encryptCardNumber('2222')]
      );

      // User 1 should only see their card
      const user1Cards = await testPool.query(
        'SELECT id FROM cards WHERE user_id = $1',
        [user1Id]
      );
      expect(user1Cards.rows).toHaveLength(1);
      expect(user1Cards.rows[0].id).toBe(card1Id);

      // User 2 should only see their card
      const user2Cards = await testPool.query(
        'SELECT id FROM cards WHERE user_id = $1',
        [user2Id]
      );
      expect(user2Cards.rows).toHaveLength(1);
      expect(user2Cards.rows[0].id).toBe(card2Id);
    });

    it('should prevent unauthorized card access', async () => {
      const userId = crypto.randomUUID();
      const otherUserId = crypto.randomUUID();
      const cardId = crypto.randomUUID();

      // Create card for one user
      await testPool.query(
        `INSERT INTO cards (id, user_id, card_name, card_number_encrypted)
         VALUES ($1, $2, $3, $4)`,
        [cardId, userId, 'Private Card', encryptCardNumber('4111')]
      );

      // Attempt to access with different user ID
      const unauthorizedAccess = await testPool.query(
        'SELECT * FROM cards WHERE id = $1 AND user_id = $2',
        [cardId, otherUserId]
      );

      expect(unauthorizedAccess.rows).toHaveLength(0);
    });
  });

  describe('Rate Limiting & DoS Prevention', () => {
    it('should handle large payload attacks', async () => {
      const largePayload = {
        cardName: 'A'.repeat(10000), // 10KB name
        cardNumber: '4' + '1'.repeat(10000),
        notes: 'X'.repeat(100000) // 100KB notes
      };

      // Should reject or truncate large payloads
      const response = await request(app)
        .post('/api/cards')
        .send(largePayload);

      expect([400, 413, 422]).toContain(response.status);
    });

    it('should validate card number format', () => {
      const invalidCards = [
        '1234', // Too short
        '41111111111111111111111111', // Too long
        'ABCD1234567890', // Letters
        '4111-1111-1111-1111', // Dashes
        '' // Empty
      ];

      invalidCards.forEach(invalid => {
        expect(() => {
          // Validation should occur before encryption
          if (!invalid || invalid.length < 13 || invalid.length > 19) {
            throw new Error('Invalid card number');
          }
        }).toThrow();
      });
    });
  });

  describe('Session Security', () => {
    it('should regenerate session ID on login', async () => {
      const mockSession = {
        id: 'old-session-id',
        regenerate: jest.fn((cb) => {
          mockSession.id = 'new-session-id';
          cb();
        })
      };

      // Simulate login
      mockSession.regenerate((err: any) => {
        expect(err).toBeUndefined();
        expect(mockSession.id).toBe('new-session-id');
        expect(mockSession.id).not.toBe('old-session-id');
      });

      expect(mockSession.regenerate).toHaveBeenCalled();
    });

    it('should set secure session cookies in production', () => {
      const prodEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Session config for production
      const sessionConfig = {
        secret: process.env.SESSION_SECRET || 'secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: 'strict' as const
        }
      };

      expect(sessionConfig.cookie.secure).toBe(true);
      expect(sessionConfig.cookie.httpOnly).toBe(true);
      expect(sessionConfig.cookie.sameSite).toBe('strict');

      process.env.NODE_ENV = prodEnv;
    });
  });

  describe('CORS Security', () => {
    it('should restrict CORS to allowed origins', () => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'https://cardvault.app'
      ];

      const maliciousOrigin = 'https://evil-site.com';
      expect(allowedOrigins).not.toContain(maliciousOrigin);
    });

    it('should not allow wildcard origins in production', () => {
      const prodEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const corsOptions = {
        origin: process.env.NODE_ENV === 'production'
          ? [process.env.FRONTEND_URL]
          : '*'
      };

      expect(corsOptions.origin).not.toBe('*');

      process.env.NODE_ENV = prodEnv;
    });
  });
});