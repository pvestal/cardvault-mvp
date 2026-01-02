# CardVault MVP

## Goal
A minimal gift card wallet that **works at checkout**. Store card number securely, display scannable barcode, reveal PIN when needed.

## Architecture
- **Backend**: Express + PostgreSQL + JWT auth
- **Frontend**: Vue 3 + PWA for offline use
- **Security**: AES-256 encryption for card numbers/PINs

## Success Criteria
1. Add actual gift card
2. Barcode scans at register
3. PIN reveals when tapped
4. Works offline

## Quick Start
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## API Endpoints
- `POST /api/auth/login` - Username/password auth
- `POST /api/auth/register` - Create account
- `GET /api/cards` - List user's cards
- `POST /api/cards` - Add card
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card

## Database Schema
```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards (encrypted storage)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    card_number_enc BYTEA NOT NULL,
    pin_enc BYTEA,
    barcode_format VARCHAR(50) DEFAULT 'CODE_128',
    balance DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

No OAuth. No Plaid. No AI. Just working card storage and display.