/**
 * Test database utilities for integration testing
 * Uses mock pool for isolated testing
 */

import { Pool } from 'pg';

let pool: Pool;
const mockData = {
  users: new Map(),
  cards: new Map()
};

// Mock Pool implementation
class MockPool {
  async query(text: string, params?: any[]): Promise<any> {
    const queryLower = text.toLowerCase();

    // Handle INSERT queries
    if (queryLower.includes('insert into users')) {
      const id = 'test-user-' + Math.random().toString(36).substr(2, 9);
      const user = {
        id,
        username: params?.[0] || 'testuser',
        password_hash: params?.[1] || 'hashedpassword',
        email: params?.[2] || null,
        google_id: params?.[3] || null,
        apple_id: params?.[4] || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockData.users.set(user.username, user);
      return { rows: [user], rowCount: 1 };
    }

    // Handle SELECT from users
    if (queryLower.includes('select') && queryLower.includes('from users')) {
      const username = params?.[0];
      if (username && mockData.users.has(username)) {
        return { rows: [mockData.users.get(username)], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // Handle INSERT into cards
    if (queryLower.includes('insert into cards')) {
      const id = 'test-card-' + Math.random().toString(36).substr(2, 9);
      const card = {
        id,
        user_id: params?.[0],
        card_name: params?.[1],
        card_number_encrypted: params?.[2],
        pin: params?.[3],
        barcode_data: params?.[4],
        notes: params?.[5],
        created_at: new Date(),
        updated_at: new Date()
      };
      mockData.cards.set(id, card);
      return { rows: [card], rowCount: 1 };
    }

    // Handle SELECT from cards
    if (queryLower.includes('select') && queryLower.includes('from cards')) {
      const userId = params?.[0];
      if (userId) {
        const userCards = Array.from(mockData.cards.values())
          .filter(card => card.user_id === userId);
        return { rows: userCards, rowCount: userCards.length };
      }
      return { rows: [], rowCount: 0 };
    }

    // Handle table existence checks
    if (queryLower.includes('information_schema')) {
      return { rows: [{ exists: true }], rowCount: 1 };
    }

    // Default response
    return { rows: [], rowCount: 0 };
  }

  async end(): Promise<void> {
    // No-op for mock
  }
}

export const setupTestDb = async (): Promise<Pool> => {
  // Create mock pool
  pool = new MockPool() as any;
  return pool;
};

export const cleanupTestDb = async (): Promise<void> => {
  mockData.users.clear();
  mockData.cards.clear();
  if (pool) {
    await pool.end();
  }
};

export const clearTestDb = async (): Promise<void> => {
  mockData.users.clear();
  mockData.cards.clear();
};

export const getTestDb = (): Pool => {
  if (!pool) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return pool;
};