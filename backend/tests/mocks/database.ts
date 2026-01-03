/**
 * Database mocking utilities
 */

import { Pool } from 'pg';

/**
 * Mock Pool class for unit testing
 */
export class MockPool {
  private queryResults: Map<string, any> = new Map();
  private queryCount = 0;

  // Mock the query method with call-based responses
  query = jest.fn().mockImplementation(async (text: string, params?: any[]) => {
    this.queryCount++;

    // Return predefined results based on query patterns
    const queryKey = this.normalizeQuery(text);

    if (this.queryResults.has(queryKey)) {
      return this.queryResults.get(queryKey);
    }

    // Default responses for common queries
    if (text.includes('INSERT INTO users')) {
      return Promise.resolve({
        rows: [{
          id: 'test-user-id',
          username: params?.[0] || 'testuser',
          email: params?.[2] || 'test@example.com'
        }],
        rowCount: 1
      });
    }

    if (text.includes('SELECT') && text.includes('FROM users')) {
      return Promise.resolve({
        rows: [{
          id: 'test-user-id',
          username: 'testuser',
          password_hash: '$2a$10$hashedpassword',
          email: 'test@example.com'
        }],
        rowCount: 1
      });
    }

    if (text.includes('INSERT INTO cards')) {
      return Promise.resolve({
        rows: [{
          id: 'test-card-id',
          user_id: params?.[0] || 'test-user-id',
          name: params?.[1] || 'Test Card',
          barcode_format: 'CODE_128',
          balance: 100.00,
          notes: 'Test notes',
          created_at: new Date().toISOString()
        }],
        rowCount: 1
      });
    }

    if (text.includes('SELECT') && text.includes('FROM cards') && text.includes('WHERE id =')) {
      // Single card select
      return Promise.resolve({
        rows: [{
          id: 'test-card-id',
          user_id: 'test-user-id',
          name: 'Test Card',
          card_number_enc: 'encrypted-card-number',
          pin_enc: 'encrypted-pin',
          barcode_format: 'CODE_128',
          balance: 100.00,
          notes: 'Test notes',
          created_at: new Date().toISOString()
        }],
        rowCount: 1
      });
    }

    if (text.includes('SELECT') && text.includes('FROM cards')) {
      // All cards select
      return Promise.resolve({
        rows: [{
          id: 'test-card-id',
          name: 'Test Card',
          barcode_format: 'CODE_128',
          balance: 100.00,
          notes: 'Test notes',
          created_at: new Date().toISOString()
        }],
        rowCount: 1
      });
    }

    if (text.includes('UPDATE')) {
      return Promise.resolve({
        rows: [{
          id: 'test-card-id',
          name: 'Updated Card',
          barcode_format: 'CODE_128',
          balance: 150.00,
          notes: 'Updated notes',
          created_at: new Date().toISOString()
        }],
        rowCount: 1
      });
    }

    if (text.includes('DELETE')) {
      return Promise.resolve({
        rows: [],
        rowCount: 1
      });
    }

    // Default empty result
    return Promise.resolve({
      rows: [],
      rowCount: 0
    });
  });

  end = jest.fn().mockResolvedValue(undefined);

  /**
   * Set predefined result for specific query
   */
  mockQueryResult(queryPattern: string, result: any) {
    const key = this.normalizeQuery(queryPattern);
    this.queryResults.set(key, result);
  }

  /**
   * Clear all mocked results
   */
  clearMocks() {
    this.queryResults.clear();
    this.queryCount = 0;
    this.query.mockClear();
    this.end.mockClear();
  }

  /**
   * Get number of queries executed
   */
  getQueryCount(): number {
    return this.queryCount;
  }

  /**
   * Normalize query string for comparison
   */
  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\\s+/g, ' ');
  }
}

/**
 * Create a mock Pool instance
 */
export const createMockPool = (): MockPool => {
  return new MockPool();
};

/**
 * Mock Pool constructor for jest.mock
 */
export const mockPoolConstructor = jest.fn(() => createMockPool());