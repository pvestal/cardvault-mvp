/**
 * Test database utilities for integration testing
 * Provides simple mocking without real PostgreSQL dependency
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// In-memory store for test data
const mockData = {
  users: new Map<string, any>(),
  cards: new Map<string, any>()
};

// Mock Pool implementation - handles common query patterns
class MockPool {
  async query(text: string, params?: any[]): Promise<any> {
    const queryLower = text.toLowerCase().replace(/\s+/g, ' ').trim();

    // Handle INSERT INTO users with RETURNING clause
    if (queryLower.includes('insert into users')) {
      // Check for duplicate username
      const username = params?.[0];
      if (mockData.users.has(username)) {
        throw new Error('duplicate key value violates unique constraint "users_username_key"');
      }

      const id = 'test-user-' + Math.random().toString(36).substr(2, 9);
      const user = {
        id,
        username: params?.[0] || 'testuser',
        password_hash: params?.[1] || await bcrypt.hash('password123', 10),
        email: params?.[2] || null,
        google_id: params?.[3] || null,
        apple_id: params?.[4] || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockData.users.set(user.username, user);

      // Handle RETURNING clause
      if (queryLower.includes('returning')) {
        const returnFields: any = { id: user.id };
        if (queryLower.includes('returning id, username')) {
          returnFields.username = user.username;
        } else if (queryLower.includes('returning *')) {
          return { rows: [user], rowCount: 1 };
        }
        return { rows: [returnFields], rowCount: 1 };
      }

      return { rows: [user], rowCount: 1 };
    }

    // Handle SELECT from users with proper field selection
    if (queryLower.includes('select') && queryLower.includes('from users')) {
      // Handle WHERE username = $1
      if (queryLower.includes('where username')) {
        const username = params?.[0];
        if (username && mockData.users.has(username)) {
          const user = mockData.users.get(username);

          // Parse SELECT fields
          if (queryLower.includes('select id, username, password_hash')) {
            return {
              rows: [{
                id: user.id,
                username: user.username,
                password_hash: user.password_hash
              }],
              rowCount: 1
            };
          }

          return { rows: [user], rowCount: 1 };
        }
      }

      // Handle WHERE id = $1
      if (queryLower.includes('where id')) {
        const userId = params?.[0];
        for (const user of mockData.users.values()) {
          if (user.id === userId) {
            return { rows: [user], rowCount: 1 };
          }
        }
      }

      return { rows: [], rowCount: 0 };
    }

    // Handle INSERT into cards with RETURNING clause
    if (queryLower.includes('insert into cards')) {
      const id = 'test-card-' + Math.random().toString(36).substr(2, 9);

      // Parse the INSERT query to get field names
      const fieldsMatch = text.match(/INSERT INTO cards\s*\(([^)]+)\)/i);
      const fields = fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : [];

      const card: any = {
        id,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Map params to fields
      fields.forEach((field, index) => {
        if (params && params[index] !== undefined) {
          card[field] = params[index];
        }
      });

      mockData.cards.set(id, card);

      // Handle RETURNING clause
      if (queryLower.includes('returning')) {
        if (queryLower.includes('returning *')) {
          return { rows: [card], rowCount: 1 };
        }
        const returnMatch = text.match(/RETURNING\s+(.+)$/i);
        if (returnMatch) {
          const returnFields = returnMatch[1].split(',').map(f => f.trim());
          const returnData: any = {};
          returnFields.forEach(field => {
            returnData[field] = card[field];
          });
          return { rows: [returnData], rowCount: 1 };
        }
      }

      return { rows: [{ id }], rowCount: 1 };
    }

    // Handle SELECT from cards with various WHERE conditions
    if (queryLower.includes('select') && queryLower.includes('from cards')) {
      // Handle WHERE id = $1 AND user_id = $2
      if (queryLower.includes('where id') && queryLower.includes('and user_id')) {
        const cardId = params?.[0];
        const userId = params?.[1];
        const card = mockData.cards.get(cardId);

        if (card && card.user_id === userId) {
          return { rows: [card], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // Handle WHERE user_id = $1
      if (queryLower.includes('where user_id')) {
        const userId = params?.[0];
        const userCards = Array.from(mockData.cards.values())
          .filter((card: any) => card.user_id === userId)
          .sort((a: any, b: any) => b.created_at.getTime() - a.created_at.getTime());
        return { rows: userCards, rowCount: userCards.length };
      }

      // Handle WHERE id = $1
      if (queryLower.includes('where id')) {
        const cardId = params?.[0];
        const card = mockData.cards.get(cardId);
        if (card) {
          return { rows: [card], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      return { rows: [], rowCount: 0 };
    }

    // Handle UPDATE cards
    if (queryLower.includes('update cards')) {
      const idMatch = queryLower.match(/where id = \$(\d+)/);
      const paramIndex = idMatch ? parseInt(idMatch[1]) - 1 : -1;

      if (paramIndex >= 0 && params) {
        const cardId = params[paramIndex];
        const card = mockData.cards.get(cardId);

        if (card) {
          // Parse SET clause and update fields
          const setMatch = text.match(/SET\s+(.+?)\s+WHERE/i);
          if (setMatch) {
            const updates = setMatch[1].split(',').map(u => u.trim());
            updates.forEach(update => {
              const [field, placeholder] = update.split('=').map(s => s.trim());
              const valueIndex = parseInt(placeholder.replace('$', '')) - 1;
              if (params[valueIndex] !== undefined) {
                card[field] = params[valueIndex];
              }
            });
          }

          return { rows: [card], rowCount: 1 };
        }
      }

      return { rows: [], rowCount: 0 };
    }

    // Handle DELETE from cards
    if (queryLower.includes('delete from cards')) {
      const cardId = params?.[0];
      const userId = params?.[1];

      if (mockData.cards.has(cardId)) {
        const card = mockData.cards.get(cardId);
        if (!userId || card.user_id === userId) {
          mockData.cards.delete(cardId);
          return { rows: [], rowCount: 1 };
        }
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

let pool: Pool;

export const setupTestDb = async (): Promise<Pool> => {
  // Clear any existing data
  mockData.users.clear();
  mockData.cards.clear();

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