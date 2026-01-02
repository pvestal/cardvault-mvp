import express from 'express';
import { Pool } from 'pg';
import { CryptoService } from '../services/crypto';
import { authenticateToken } from '../middleware/auth';

interface AuthRequest extends express.Request {
  userId?: string;
}

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Lazy load crypto service to ensure env vars are loaded
const getCrypto = () => new CryptoService();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all cards for user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, barcode_format, balance, notes, created_at
      FROM cards
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get single card with decrypted data (for display)
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT id, name, card_number_enc, pin_enc, barcode_format, balance, notes, created_at
      FROM cards
      WHERE id = $1 AND user_id = $2
    `, [id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = result.rows[0];

    // Decrypt sensitive data for display
    const crypto = getCrypto();
    const decryptedCard = {
      ...card,
      card_number: crypto.decrypt(card.card_number_enc),
      pin: card.pin_enc ? crypto.decrypt(card.pin_enc) : null
    };

    // Remove encrypted fields from response
    delete decryptedCard.card_number_enc;
    delete decryptedCard.pin_enc;

    res.json(decryptedCard);
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Add new card
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, card_number, pin, barcode_format, balance, notes } = req.body;

    if (!name || !card_number) {
      return res.status(400).json({ error: 'Name and card number required' });
    }

    // Encrypt sensitive data
    const crypto = getCrypto();
    const card_number_enc = crypto.encrypt(card_number);
    const pin_enc = pin ? crypto.encrypt(pin) : null;

    const result = await pool.query(`
      INSERT INTO cards (user_id, name, card_number_enc, pin_enc, barcode_format, balance, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, barcode_format, balance, notes, created_at
    `, [req.userId, name, card_number_enc, pin_enc, barcode_format || 'CODE_128', balance, notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, card_number, pin, barcode_format, balance, notes } = req.body;

    // Check if card exists and belongs to user
    const existingCard = await pool.query('SELECT id FROM cards WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (existingCard.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Encrypt sensitive data if provided
    const crypto = getCrypto();
    let card_number_enc, pin_enc;
    if (card_number) {
      card_number_enc = crypto.encrypt(card_number);
    }
    if (pin) {
      pin_enc = crypto.encrypt(pin);
    }

    const result = await pool.query(`
      UPDATE cards
      SET name = COALESCE($3, name),
          card_number_enc = COALESCE($4, card_number_enc),
          pin_enc = COALESCE($5, pin_enc),
          barcode_format = COALESCE($6, barcode_format),
          balance = COALESCE($7, balance),
          notes = COALESCE($8, notes)
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, barcode_format, balance, notes, created_at
    `, [id, req.userId, name, card_number_enc, pin_enc, barcode_format, balance, notes]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [id, req.userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

export default router;