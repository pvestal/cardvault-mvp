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

## SSO Authentication (New!)

Google OAuth SSO has been added for secure authentication.

### Setup for New Clones

1. **Database Setup**
   ```bash
   # Run SSO migration
   cd backend
   npx tsx src/db/migrate-sso.ts
   ```

2. **Environment Configuration**
   Add to `backend/.env`:
   ```env
   # Google OAuth (required for SSO)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   FRONTEND_URL=http://localhost:8082
   API_BASE_URL=http://localhost:3001
   ```

3. **Google Cloud Console Setup**
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `http://localhost:3001/api/cardvault/auth/google/callback`
   - See `docs/CREATE_NEW_OAUTH.md` for detailed steps

4. **Test SSO**
   Visit `http://localhost:8082/cardvault/login` and click "Continue with Google"

### Additional API Endpoints (SSO)
- `GET /api/auth/providers` - List OAuth providers
- `GET /api/auth/google` - Start Google OAuth
- `GET /api/auth/google/callback` - OAuth callback

### Production Deployment

For production, update:
- `FRONTEND_URL=https://your-domain.com/cardvault`
- `API_BASE_URL=https://your-domain.com`
- Google Console redirect URI: `https://your-domain.com/api/cardvault/auth/google/callback`

### Nginx Configuration Example
```nginx
# Frontend
location /cardvault {
    proxy_pass http://localhost:8082;
}

# Backend API
location /api/cardvault/ {
    proxy_pass http://localhost:3001/api/;
}
```

No Plaid. No AI. Just working card storage with secure authentication.