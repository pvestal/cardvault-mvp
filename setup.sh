#!/bin/bash
set -e

echo "🚀 CardVault MVP Setup Script"
echo "============================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ and npm"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚙️ Creating backend .env file..."
    cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=postgresql://cardvault_user:cardvault_password@localhost:5432/cardvault
JWT_SECRET=your-random-jwt-secret-change-in-production
ENCRYPTION_KEY=abcdef1234567890abcdef1234567890
PORT=3001
SESSION_SECRET=your-session-secret-change-in-production
FRONTEND_URL=http://localhost:8082
API_BASE_URL=http://localhost:3001

# Google OAuth (configure these after creating OAuth client)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EOF
    echo "✅ Created backend/.env (please update OAuth credentials)"
else
    echo "⚠️ backend/.env already exists, skipping creation"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Set up PostgreSQL database:"
echo "   createdb cardvault"
echo "   createuser cardvault_user"
echo "   # Set password for cardvault_user"
echo ""
echo "2. Run database migration:"
echo "   cd backend"
echo "   npx tsx src/db/migrate-sso.ts"
echo ""
echo "3. Configure Google OAuth:"
echo "   - See docs/CREATE_NEW_OAUTH.md for detailed steps"
echo "   - Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"
echo ""
echo "4. Start development servers:"
echo "   # Terminal 1 (Backend)"
echo "   cd backend && npm run dev"
echo ""
echo "   # Terminal 2 (Frontend)"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Visit http://localhost:8082/cardvault/login"
echo ""
echo "📖 For detailed setup instructions, see README.md"