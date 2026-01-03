import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import compression from 'compression';
import passport from './config/passport';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import authSSORoutes from './routes/auth-sso';
import cardRoutes from './routes/cards';
import { validateEnvironment, productionConfig } from './config/production';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit';

dotenv.config();

// Validate environment in production
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Performance Middleware
app.use(helmet());
app.use(compression());
app.use(cors(productionConfig.cors));
app.use(express.json({ limit: '10mb' }));
app.use(apiRateLimit);

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'cardvault-backend' });
});

// Routes with rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/auth', authRateLimit, authSSORoutes); // SSO routes
app.use('/api/cards', cardRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CardVault backend running on port ${PORT}`);
  console.log(`📋 API available at http://localhost:${PORT}/api`);
});