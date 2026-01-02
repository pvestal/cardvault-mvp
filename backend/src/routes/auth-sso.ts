import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/cardvault/login?error=auth_failed' }),
  (req, res) => {
    // Generate JWT token after successful authentication
    const user = req.user as any;
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`/cardvault/?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      username: user.username || user.email,
      email: user.email,
      displayName: user.display_name
    }))}`);
  }
);

// Apple OAuth routes (placeholder for now)
router.get('/apple', (req, res) => {
  res.json({ message: 'Apple OAuth endpoint - configuration pending' });
});

router.post('/apple/callback', (req, res) => {
  res.json({ message: 'Apple OAuth callback - configuration pending' });
});

// Generic OAuth info endpoint
router.get('/providers', (req, res) => {
  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID) {
    providers.push({
      name: 'google',
      displayName: 'Google',
      endpoint: '/api/auth/google'
    });
  }

  if (process.env.APPLE_CLIENT_ID) {
    providers.push({
      name: 'apple',
      displayName: 'Apple',
      endpoint: '/api/auth/apple'
    });
  }

  res.json({ providers });
});

export default router;