/**
 * Test utility functions and helpers
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

export interface TestUser {
  id: string;
  username: string;
  password?: string;
  password_hash?: string;
  email?: string;
}

export interface TestCard {
  id?: string;
  user_id: string;
  name: string;
  card_number: string;
  pin?: string;
  barcode_format?: string;
  balance?: number;
  notes?: string;
}

/**
 * Create a test user in the database
 */
export const createTestUser = async (
  pool: Pool,
  userData: Partial<TestUser> = {}
): Promise<TestUser> => {
  const defaultUser = {
    username: `testuser_${Math.random().toString(36).substr(2, 9)}`,
    password: 'testpassword123',
    email: `test_${Math.random().toString(36).substr(2, 9)}@example.com`
  };

  const user = { ...defaultUser, ...userData };
  const passwordHash = await bcrypt.hash(user.password, 10);

  const result = await pool.query(
    'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
    [user.username, passwordHash, user.email]
  );

  return {
    ...result.rows[0],
    password: user.password,
    password_hash: passwordHash
  };
};

/**
 * Generate JWT token for test user
 */
export const generateTestToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

/**
 * Create test card data
 */
export const createTestCard = async (
  pool: Pool,
  userId: string,
  cardData: Partial<TestCard> = {}
): Promise<TestCard> => {
  // Import CryptoService for encryption
  const { CryptoService } = await import('../../src/services/crypto');
  const crypto = new CryptoService();

  const defaultCard = {
    name: `Test Card ${Math.random().toString(36).substr(2, 5)}`,
    card_number: '1234567890123456',
    pin: '1234',
    barcode_format: 'CODE_128',
    balance: 100.00,
    notes: 'Test card notes'
  };

  const card = { ...defaultCard, ...cardData, user_id: userId };

  // Encrypt sensitive data
  const card_number_enc = crypto.encrypt(card.card_number);
  const pin_enc = card.pin ? crypto.encrypt(card.pin) : null;

  const result = await pool.query(
    `INSERT INTO cards (user_id, name, card_number_enc, pin_enc, barcode_format, balance, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, name, barcode_format, balance, notes, created_at`,
    [userId, card.name, card_number_enc, pin_enc, card.barcode_format, card.balance, card.notes]
  );

  return {
    ...result.rows[0],
    card_number: card.card_number,
    pin: card.pin
  };
};

/**
 * Mock authentication middleware for testing
 */
export const mockAuthMiddleware = (userId: string) => {
  return (req: any, res: any, next: any) => {
    req.userId = userId;
    next();
  };
};

/**
 * Create test request with authentication headers
 */
export const withAuth = (token: string) => {
  return {
    Authorization: `Bearer ${token}`
  };
};

/**
 * Assert error response format
 */
export const expectErrorResponse = (response: any, statusCode: number, errorMessage?: string) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
};

/**
 * Assert success response format
 */
export const expectSuccessResponse = (response: any, statusCode: number = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).not.toHaveProperty('error');
};