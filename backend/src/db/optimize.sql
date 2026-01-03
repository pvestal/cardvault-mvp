-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_user_id_created ON cards(user_id, created_at DESC);

-- Analyze tables for query planner
ANALYZE users;
ANALYZE cards;

-- Configure connection pool settings
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
