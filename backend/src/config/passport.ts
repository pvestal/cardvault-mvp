import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/cardvault/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'), false);
      }

      // Check if user exists
      let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        // Create new user
        result = await pool.query(
          `INSERT INTO users (username, email, provider, provider_id, display_name)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, username, email, display_name`,
          [
            email.split('@')[0], // Use email prefix as username
            email,
            'google',
            profile.id,
            profile.displayName
          ]
        );
      } else {
        // Update existing user's provider info if needed
        await pool.query(
          `UPDATE users
           SET provider = COALESCE(provider, $1),
               provider_id = COALESCE(provider_id, $2),
               display_name = COALESCE(display_name, $3)
           WHERE email = $4`,
          ['google', profile.id, profile.displayName, email]
        );
      }

      done(null, result.rows[0]);
    } catch (error) {
      done(error as Error, false);
    }
  }));
}

export default passport;