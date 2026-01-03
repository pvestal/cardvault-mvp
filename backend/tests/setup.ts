/**
 * Global test setup configuration
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cardvault_test';

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});