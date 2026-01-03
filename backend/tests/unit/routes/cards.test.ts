/**
 * Unit tests for card CRUD operations
 */

import request from 'supertest';
import express from 'express';

// Mock dependencies BEFORE importing anything that uses them
jest.mock('../../../src/db/connection');
jest.mock('../../../src/middleware/auth');

// Mock CryptoService with a factory
const mockCrypto = {
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

jest.mock('../../../src/services/crypto', () => ({
  CryptoService: class MockCryptoService {
    encrypt = mockCrypto.encrypt;
    decrypt = mockCrypto.decrypt;
  }
}));

import { getPool } from '../../../src/db/connection';

// Import after mocking
import cardRoutes from '../../../src/routes/cards';
import { authenticateToken } from '../../../src/middleware/auth';

describe('Card Routes', () => {
  let app: express.Application;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Setup database connection mock
    mockQuery = jest.fn();
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
      end: jest.fn()
    });

    // Mock authentication middleware to pass through with test user
    (authenticateToken as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
      req.userId = 'test-user-id';
      next();
    });

    // Reset crypto mocks
    mockCrypto.encrypt.mockReset();
    mockCrypto.decrypt.mockReset();

    // Set default crypto behavior
    mockCrypto.encrypt.mockImplementation((data: string) => `encrypted_${data}`);
    mockCrypto.decrypt.mockImplementation((data: string) => data.replace('encrypted_', ''));

    // Mount routes
    app.use('/cards', cardRoutes);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /cards', () => {
    it('should fetch all cards for authenticated user', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Test Card 1',
          barcode_format: 'CODE_128',
          balance: 100.00,
          notes: 'Test notes 1',
          created_at: new Date().toISOString()
        },
        {
          id: 'card-2',
          name: 'Test Card 2',
          barcode_format: 'QR_CODE',
          balance: 50.00,
          notes: 'Test notes 2',
          created_at: new Date().toISOString()
        }
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockCards,
        rowCount: 2
      });

      const response = await request(app)
        .get('/cards');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual(mockCards[0]);
      expect(response.body[1]).toEqual(mockCards[1]);

      // Verify query was called with correct user ID
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['test-user-id']
      );
    });

    it('should return empty array when user has no cards', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .get('/cards');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/cards');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch cards');
    });
  });

  describe('GET /cards/:id', () => {
    it('should fetch single card with decrypted data', async () => {
      const mockCard = {
        id: 'card-123',
        name: 'Test Card',
        card_number_enc: 'encrypted_1234567890123456',
        pin_enc: 'encrypted_1234',
        barcode_format: 'CODE_128',
        balance: 100.00,
        notes: 'Test notes',
        created_at: new Date().toISOString()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCard],
        rowCount: 1
      });

      const response = await request(app)
        .get('/cards/card-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'card-123',
        name: 'Test Card',
        card_number: '1234567890123456',
        pin: '1234',
        barcode_format: 'CODE_128',
        balance: 100.00,
        notes: 'Test notes',
        created_at: mockCard.created_at
      });

      // Verify decryption was called
      expect(mockCrypto.decrypt).toHaveBeenCalledWith('encrypted_1234567890123456');
      expect(mockCrypto.decrypt).toHaveBeenCalledWith('encrypted_1234');

      // Verify query was called with correct parameters
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        ['card-123', 'test-user-id']
      );
    });

    it('should handle card with no PIN', async () => {
      const mockCard = {
        id: 'card-123',
        name: 'Test Card',
        card_number_enc: 'encrypted_1234567890123456',
        pin_enc: null,
        barcode_format: 'CODE_128',
        balance: 100.00,
        notes: 'Test notes',
        created_at: new Date().toISOString()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCard],
        rowCount: 1
      });

      const response = await request(app)
        .get('/cards/card-123');

      expect(response.status).toBe(200);
      expect(response.body.pin).toBeNull();
    });

    it('should return 404 for non-existent card', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .get('/cards/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/cards/card-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch card');
    });
  });

  describe('POST /cards', () => {
    it('should create new card successfully', async () => {
      const newCardData = {
        name: 'New Test Card',
        card_number: '1234567890123456',
        pin: '1234',
        barcode_format: 'CODE_128',
        balance: 75.50,
        notes: 'New card notes'
      };

      const mockCreatedCard = {
        id: 'new-card-id',
        name: 'New Test Card',
        barcode_format: 'CODE_128',
        balance: 75.50,
        notes: 'New card notes',
        created_at: new Date().toISOString()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCreatedCard],
        rowCount: 1
      });

      // Configure crypto mocks
      mockCrypto.encrypt.mockImplementation((data: string) => `encrypted_${data}`);

      const response = await request(app)
        .post('/cards')
        .send(newCardData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockCreatedCard);

      // Verify encryption was called
      expect(mockCrypto.encrypt).toHaveBeenCalledWith('1234567890123456');
      expect(mockCrypto.encrypt).toHaveBeenCalledWith('1234');

      // Verify database insertion with encrypted data
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cards'),
        [
          'test-user-id',
          'New Test Card',
          'encrypted_1234567890123456',
          'encrypted_1234',
          'CODE_128',
          75.50,
          'New card notes'
        ]
      );
    });

    it('should create card without PIN', async () => {
      const newCardData = {
        name: 'Card Without PIN',
        card_number: '1234567890123456',
        barcode_format: 'QR_CODE',
        balance: 100.00,
        notes: 'No PIN card'
      };

      const mockCreatedCard = {
        id: 'new-card-id',
        name: 'Card Without PIN',
        barcode_format: 'QR_CODE',
        balance: 100.00,
        notes: 'No PIN card',
        created_at: new Date().toISOString()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockCreatedCard],
        rowCount: 1
      });

      mockCrypto.encrypt.mockReturnValue('encrypted_1234567890123456');

      const response = await request(app)
        .post('/cards')
        .send(newCardData);

      expect(response.status).toBe(201);

      // Verify PIN encryption was not called
      expect(mockCrypto.encrypt).toHaveBeenCalledTimes(1);
      expect(mockCrypto.encrypt).toHaveBeenCalledWith('1234567890123456');

      // Verify database insertion with null PIN
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cards'),
        expect.arrayContaining([null])
      );
    });

    it('should use default barcode format when not provided', async () => {
      const newCardData = {
        name: 'Default Format Card',
        card_number: '1234567890123456'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'new-card-id',
          name: 'Default Format Card',
          barcode_format: 'CODE_128',
          balance: null,
          notes: null,
          created_at: new Date().toISOString()
        }],
        rowCount: 1
      });

      mockCrypto.encrypt.mockReturnValue('encrypted_1234567890123456');

      const response = await request(app)
        .post('/cards')
        .send(newCardData);

      expect(response.status).toBe(201);

      // Verify default barcode format was used
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cards'),
        expect.arrayContaining(['CODE_128'])
      );
    });

    it('should reject creation without required name', async () => {
      const response = await request(app)
        .post('/cards')
        .send({
          card_number: '1234567890123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name and card number required');
    });

    it('should reject creation without required card number', async () => {
      const response = await request(app)
        .post('/cards')
        .send({
          name: 'Test Card'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name and card number required');
    });

    it('should handle database errors during creation', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      mockCrypto.encrypt.mockReturnValue('encrypted_data');

      const response = await request(app)
        .post('/cards')
        .send({
          name: 'Test Card',
          card_number: '1234567890123456'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create card');
    });
  });

  describe('PUT /cards/:id', () => {
    it('should update card successfully', async () => {
      mockCrypto.encrypt.mockImplementation((data: string) => `encrypted_${data}`);

      // Setup sequential query responses
      mockQuery
        .mockResolvedValueOnce({
          // First call: card existence check
          rows: [{ id: 'card-123' }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          // Second call: update result
          rows: [{
            id: 'card-123',
            name: 'Updated Card',
            barcode_format: 'QR_CODE',
            balance: 150.00,
            notes: 'Updated notes',
            created_at: new Date().toISOString()
          }],
          rowCount: 1
        });

      const updateData = {
        name: 'Updated Card',
        card_number: '9876543210987654',
        pin: '5678',
        barcode_format: 'QR_CODE',
        balance: 150.00,
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put('/cards/card-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Card');
      expect(response.body.balance).toBe(150.00);

      // Verify encryption was called for sensitive data
      expect(mockCrypto.encrypt).toHaveBeenCalledWith('9876543210987654');
      expect(mockCrypto.encrypt).toHaveBeenCalledWith('5678');

      // Verify card existence check was called first
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        'SELECT id FROM cards WHERE id = $1 AND user_id = $2',
        ['card-123', 'test-user-id']
      );
    });

    it('should return 404 for non-existent card', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .put('/cards/nonexistent')
        .send({
          name: 'Updated Card'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });

    it('should handle partial updates', async () => {
      // Setup sequential query responses
      mockQuery
        .mockResolvedValueOnce({
          // First call: card existence check
          rows: [{ id: 'card-123' }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          // Second call: update result
          rows: [{
            id: 'card-123',
            name: 'Updated Name Only',
            barcode_format: 'CODE_128',
            balance: 100.00,
            notes: 'Original notes',
            created_at: new Date().toISOString()
          }],
          rowCount: 1
        });

      const response = await request(app)
        .put('/cards/card-123')
        .send({
          name: 'Updated Name Only'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name Only');

      // Verify no encryption calls were made
      expect(mockCrypto.encrypt).not.toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/cards/card-123')
        .send({
          name: 'Updated Card'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update card');
    });
  });

  describe('DELETE /cards/:id', () => {
    it('should delete card successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      });

      const response = await request(app)
        .delete('/cards/card-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Card deleted successfully');

      // Verify delete query was called correctly
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM cards WHERE id = $1 AND user_id = $2',
        ['card-123', 'test-user-id']
      );
    });

    it('should return 404 for non-existent card', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .delete('/cards/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });

    it('should handle database errors during deletion', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .delete('/cards/card-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete card');
    });
  });
});