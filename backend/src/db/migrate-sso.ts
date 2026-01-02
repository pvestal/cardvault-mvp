import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function migrateSSO() {
  try {
    // Add SSO-related columns to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
      ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    // Create index on provider columns for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_provider
      ON users(provider, provider_id);
    `);

    // Create index on email for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);
    `);

    // Make password_hash nullable for SSO users
    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL;
    `);

    console.log('✅ SSO migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateSSO().catch(console.error);
}