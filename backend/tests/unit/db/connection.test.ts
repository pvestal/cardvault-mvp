/**
 * Unit tests for database connection
 */

import { Pool } from 'pg';
import { getPool, setPool, closePool } from '../../../src/db/connection';

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    end: jest.fn(() => Promise.resolve()),
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn()
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
      const mockEnd = jest.fn(() => Promise.resolve());
      const mockPool = {
        end: mockEnd,
        query: jest.fn(),
      };
      setPool(mockPool as any);

      await closePool();
      expect(mockEnd).toHaveBeenCalled();
    });

    it('should handle closing when no pool exists', async () => {
      setPool(undefined as any);
      await expect(closePool()).resolves.toBeUndefined();
    });

    it('should clear the pool reference after closing', async () => {
      const mockPool = {
        end: jest.fn(() => Promise.resolve()),
        query: jest.fn(),
      };
      setPool(mockPool as any);

      await closePool();

      // After closing, getPool should create a new pool
      const newPool = getPool();
      expect(newPool).not.toBe(mockPool);
    });
  });
});