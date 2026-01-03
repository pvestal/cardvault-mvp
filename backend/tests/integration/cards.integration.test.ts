/**
 * Integration tests for card CRUD API endpoints
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { setupTestDb, cleanupTestDb, clearTestDb } from '../helpers/testDb';
import { createTestUser, generateTestToken } from '../helpers/testUtils';
import authRoutes from '../../src/routes/auth';
import cardRoutes from '../../src/routes/cards';

describe('Cards Integration Tests', () => {
  let app: express.Application;
  let testPool: Pool;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup test database
    testPool = await setupTestDb();

    // Create Express app identical to main app
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/cards', cardRoutes);

    // Override the pool used by routes for testing
    process.env.DATABASE_URL = 'test-database-url';
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Create test user and get auth token
    testUser = await createTestUser(testPool, {
      username: 'cardtestuser',
      password: 'password123',
      email: 'cardtest@example.com'
    });
    authToken = generateTestToken(testUser.id);
  });

  const authHeaders = () => ({ Authorization: `Bearer ${authToken}` });

  describe('POST /api/cards', () => {
    it('should create a new card with encrypted data', async () => {
      const cardData = {
        name: 'Starbucks Gift Card',
        card_number: '1234567890123456',
        pin: '1234',
        barcode_format: 'CODE_128',
        balance: 25.00,
        notes: 'Birthday gift from mom'
      };

      const response = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send(cardData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Starbucks Gift Card');
      expect(response.body.barcode_format).toBe('CODE_128');
      expect(response.body.balance).toBe(25.00);
      expect(response.body.notes).toBe('Birthday gift from mom');

      // Verify card was created in database with encrypted data
      const dbCard = await testPool.query(
        'SELECT id, user_id, name, card_number_enc, pin_enc FROM cards WHERE id = $1',
        [response.body.id]
      );

      expect(dbCard.rows).toHaveLength(1);
      expect(dbCard.rows[0].user_id).toBe(testUser.id);
      expect(dbCard.rows[0].name).toBe('Starbucks Gift Card');
      // Sensitive data should be encrypted (not plain text)
      expect(dbCard.rows[0].card_number_enc).not.toBe('1234567890123456');
      expect(dbCard.rows[0].pin_enc).not.toBe('1234');
    });

    it('should create card without PIN', async () => {
      const cardData = {
        name: 'Amazon Gift Card',
        card_number: '9876543210987654',
        barcode_format: 'QR_CODE',
        balance: 50.00
      };

      const response = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send(cardData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Amazon Gift Card');

      // Verify PIN is null in database
      const dbCard = await testPool.query(
        'SELECT pin_enc FROM cards WHERE id = $1',
        [response.body.id]
      );
      expect(dbCard.rows[0].pin_enc).toBeNull();
    });

    it('should use default barcode format when not specified', async () => {
      const cardData = {
        name: 'Default Format Card',
        card_number: '1111222233334444'
      };

      const response = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send(cardData);

      expect(response.status).toBe(201);
      expect(response.body.barcode_format).toBe('CODE_128');
    });

    it('should reject creation without authentication', async () => {
      const cardData = {
        name: 'Unauthorized Card',
        card_number: '1234567890123456'
      };

      const response = await request(app)
        .post('/api/cards')
        .send(cardData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject creation with invalid token', async () => {
      const cardData = {
        name: 'Invalid Token Card',
        card_number: '1234567890123456'
      };

      const response = await request(app)
        .post('/api/cards')
        .set({ Authorization: 'Bearer invalid-token' })
        .send(cardData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should validate required fields', async () => {
      // Missing name
      const missingName = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({ card_number: '1234567890123456' });
      expect(missingName.status).toBe(400);
      expect(missingName.body.error).toBe('Name and card number required');

      // Missing card number
      const missingCardNumber = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({ name: 'Test Card' });
      expect(missingCardNumber.status).toBe(400);
      expect(missingCardNumber.body.error).toBe('Name and card number required');
    });
  });

  describe('GET /api/cards', () => {
    beforeEach(async () => {
      // Create test cards
      await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({
          name: 'Test Card 1',
          card_number: '1111111111111111',
          pin: '1111',
          balance: 100.00
        });

      await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({
          name: 'Test Card 2',
          card_number: '2222222222222222',
          balance: 50.00
        });
    });

    it('should fetch all cards for authenticated user', async () => {
      const response = await request(app)
        .get('/api/cards')
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      const cardNames = response.body.map((card: any) => card.name);
      expect(cardNames).toContain('Test Card 1');
      expect(cardNames).toContain('Test Card 2');

      // Verify sensitive data is not included in list view
      response.body.forEach((card: any) => {
        expect(card).not.toHaveProperty('card_number');
        expect(card).not.toHaveProperty('pin');
        expect(card).not.toHaveProperty('card_number_enc');
        expect(card).not.toHaveProperty('pin_enc');
      });
    });

    it('should return empty array when user has no cards', async () => {
      // Create new user with no cards
      const newUser = await createTestUser(testPool);
      const newToken = generateTestToken(newUser.id);

      const response = await request(app)
        .get('/api/cards')
        .set({ Authorization: `Bearer ${newToken}` });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should only return cards belonging to authenticated user', async () => {
      // Create another user with their own cards
      const otherUser = await createTestUser(testPool, { username: 'otheruser' });
      const otherToken = generateTestToken(otherUser.id);

      await request(app)
        .post('/api/cards')
        .set({ Authorization: `Bearer ${otherToken}` })
        .send({
          name: 'Other User Card',
          card_number: '9999999999999999'
        });

      // Original user should only see their cards
      const response = await request(app)
        .get('/api/cards')
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every((card: any) => card.name !== 'Other User Card')).toBe(true);
    });
  });

  describe('GET /api/cards/:id', () => {
    let createdCard: any;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({
          name: 'Detailed Card',
          card_number: '1234567890123456',
          pin: '5678',
          barcode_format: 'QR_CODE',
          balance: 75.50,
          notes: 'Test notes'
        });
      createdCard = createResponse.body;
    });

    it('should fetch single card with decrypted data', async () => {
      const response = await request(app)
        .get(`/api/cards/${createdCard.id}`)
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdCard.id);
      expect(response.body.name).toBe('Detailed Card');
      expect(response.body.card_number).toBe('1234567890123456');
      expect(response.body.pin).toBe('5678');
      expect(response.body.barcode_format).toBe('QR_CODE');
      expect(response.body.balance).toBe(75.50);
      expect(response.body.notes).toBe('Test notes');

      // Verify encrypted fields are not in response
      expect(response.body).not.toHaveProperty('card_number_enc');
      expect(response.body).not.toHaveProperty('pin_enc');
    });

    it('should return 404 for non-existent card', async () => {
      const response = await request(app)
        .get('/api/cards/00000000-0000-0000-0000-000000000000')
        .set(authHeaders());

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });

    it('should prevent access to other users cards', async () => {
      // Create another user
      const otherUser = await createTestUser(testPool, { username: 'otheruser2' });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .get(`/api/cards/${createdCard.id}`)
        .set({ Authorization: `Bearer ${otherToken}` });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });
  });

  describe('PUT /api/cards/:id', () => {
    let createdCard: any;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({
          name: 'Updatable Card',
          card_number: '1111111111111111',
          pin: '1111',
          balance: 100.00,
          notes: 'Original notes'
        });
      createdCard = createResponse.body;
    });

    it('should update card successfully', async () => {
      const updateData = {
        name: 'Updated Card Name',
        card_number: '2222222222222222',
        pin: '2222',
        balance: 150.00,
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/cards/${createdCard.id}`)
        .set(authHeaders())
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Card Name');
      expect(response.body.balance).toBe(150.00);
      expect(response.body.notes).toBe('Updated notes');

      // Verify changes were persisted
      const fetchResponse = await request(app)
        .get(`/api/cards/${createdCard.id}`)
        .set(authHeaders());

      expect(fetchResponse.body.card_number).toBe('2222222222222222');
      expect(fetchResponse.body.pin).toBe('2222');
    });

    it('should handle partial updates', async () => {
      const updateData = {
        name: 'Partially Updated'
      };

      const response = await request(app)
        .put(`/api/cards/${createdCard.id}`)
        .set(authHeaders())
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Partially Updated');

      // Other fields should remain unchanged
      const fetchResponse = await request(app)
        .get(`/api/cards/${createdCard.id}`)
        .set(authHeaders());

      expect(fetchResponse.body.card_number).toBe('1111111111111111');
      expect(fetchResponse.body.balance).toBe(100.00);
    });

    it('should prevent updating other users cards', async () => {
      const otherUser = await createTestUser(testPool, { username: 'otheruser3' });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .put(`/api/cards/${createdCard.id}`)
        .set({ Authorization: `Bearer ${otherToken}` })
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });
  });

  describe('DELETE /api/cards/:id', () => {
    let createdCard: any;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send({
          name: 'Deletable Card',
          card_number: '9999999999999999',
          balance: 25.00
        });
      createdCard = createResponse.body;
    });

    it('should delete card successfully', async () => {
      const response = await request(app)
        .delete(`/api/cards/${createdCard.id}`)
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Card deleted successfully');

      // Verify card is deleted
      const fetchResponse = await request(app)
        .get(`/api/cards/${createdCard.id}`)
        .set(authHeaders());

      expect(fetchResponse.status).toBe(404);

      // Verify card is not in user's card list
      const listResponse = await request(app)
        .get('/api/cards')
        .set(authHeaders());

      expect(listResponse.body.find((card: any) => card.id === createdCard.id)).toBeUndefined();
    });

    it('should return 404 for non-existent card', async () => {
      const response = await request(app)
        .delete('/api/cards/00000000-0000-0000-0000-000000000000')
        .set(authHeaders());

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');
    });

    it('should prevent deleting other users cards', async () => {
      const otherUser = await createTestUser(testPool, { username: 'otheruser4' });
      const otherToken = generateTestToken(otherUser.id);

      const response = await request(app)
        .delete(`/api/cards/${createdCard.id}`)
        .set({ Authorization: `Bearer ${otherToken}` });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Card not found');

      // Verify card still exists for original user
      const fetchResponse = await request(app)
        .get(`/api/cards/${createdCard.id}`)
        .set(authHeaders());

      expect(fetchResponse.status).toBe(200);
    });
  });

  describe('Full Card Lifecycle', () => {
    it('should complete full CRUD lifecycle', async () => {
      // 1. Create card
      const createData = {
        name: 'Lifecycle Test Card',
        card_number: '1234123412341234',
        pin: '9999',
        barcode_format: 'CODE_128',
        balance: 200.00,
        notes: 'Lifecycle test'
      };

      const createResponse = await request(app)
        .post('/api/cards')
        .set(authHeaders())
        .send(createData);

      expect(createResponse.status).toBe(201);
      const cardId = createResponse.body.id;

      // 2. Read card
      const readResponse = await request(app)
        .get(`/api/cards/${cardId}`)
        .set(authHeaders());

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.card_number).toBe('1234123412341234');

      // 3. Update card
      const updateData = {
        name: 'Updated Lifecycle Card',
        balance: 150.00
      };

      const updateResponse = await request(app)
        .put(`/api/cards/${cardId}`)
        .set(authHeaders())
        .send(updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Lifecycle Card');
      expect(updateResponse.body.balance).toBe(150.00);

      // 4. Delete card
      const deleteResponse = await request(app)
        .delete(`/api/cards/${cardId}`)
        .set(authHeaders());

      expect(deleteResponse.status).toBe(200);

      // 5. Verify deletion
      const finalReadResponse = await request(app)
        .get(`/api/cards/${cardId}`)
        .set(authHeaders());

      expect(finalReadResponse.status).toBe(404);
    });
  });
});