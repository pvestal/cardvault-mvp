/**
 * Unit tests for database connection
 */

import { Pool } from 'pg';
import { getPool, setPool, closePool } from '../../../src/db/connection';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    end: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
  })),
}));

describe('Database Connection', () => {
  beforeEach(() => {
    // Clear the pool singleton
    setPool(undefined as any);
  });

  describe('getPool', () => {
    it('should create a pool singleton', () => {
      const pool1 = getPool();
      const pool2 = getPool();

      expect(pool1).toBe(pool2); // Same instance
      expect(Pool).toHaveBeenCalledTimes(1); // Only created once
    });

    it('should use DATABASE_URL from environment', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';

      getPool();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgresql://test:test@localhost/testdb',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      );
    });
  });

  describe('setPool', () => {
    it('should allow setting a custom pool', () => {
      const mockPool = { custom: true } as any;
      setPool(mockPool);

      const pool = getPool();
      expect(pool).toBe(mockPool);
    });
  });

  describe('closePool', () => {
    it('should close the pool if it exists', async () => {
      const pool = getPool();
      await closePool();

      expect(pool.end).toHaveBeenCalled();
    });

    it('should handle closing when no pool exists', async () => {
      await expect(closePool()).resolves.toBeUndefined();
    });

    it('should clear the pool reference after closing', async () => {
      getPool(); // Create a pool
      await closePool();

      // Getting pool after close should create a new one
      const newPool = getPool();
      expect(Pool).toHaveBeenCalledTimes(2);
    });
  });
});