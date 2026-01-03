/**
 * Database connection management
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create singleton pool instance
let pool: Pool;

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
};

// Allow tests to inject their own pool
export const setPool = (testPool: Pool): void => {
  pool = testPool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined as any;
  }
};