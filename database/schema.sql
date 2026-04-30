-- PredictMarket schema for PostgreSQL 15 / Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table: application accounts and wallet state
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(30) UNIQUE NOT NULL CHECK (length(username) >= 3),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 1000.00 CHECK (wallet_balance >= 0),
  streak_count INTEGER NOT NULL DEFAULT 0 CHECK (streak_count >= 0),
  rank VARCHAR(20) NOT NULL DEFAULT 'Novice' CHECK (rank IN ('Novice', 'Analyst', 'Expert', 'Oracle', 'Legend')),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table: market classification metadata
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(10) NOT NULL
);

-- Markets table: prediction market definitions and aggregate volume
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL CHECK (length(title) >= 10),
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  yes_volume NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (yes_volume >= 0),
  no_volume NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (no_volume >= 0),
  resolution_side VARCHAR(3) CHECK (resolution_side IN ('YES', 'NO')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'RESOLVED', 'CANCELLED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT markets_expires_after_created CHECK (expires_at > created_at)
);

-- Bets table: user positions within markets
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id),
  side VARCHAR(3) NOT NULL CHECK (side IN ('YES', 'NO')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  shares NUMERIC(12,4) NOT NULL CHECK (shares > 0),
  potential_payout NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'WON', 'LOST', 'REFUNDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table: immutable wallet ledger events
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('BET_PLACED', 'BET_WON', 'BET_REFUND', 'SIGNUP_BONUS', 'DAILY_BONUS')),
  amount NUMERIC(10,2) NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table: public discussion per market
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL CHECK (length(content) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leaderboard score table: denormalized performance metrics per user
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(12,2) NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  total_wagered NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin logs table: privileged action trail
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: markets
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category_id ON markets(category_id);
CREATE INDEX IF NOT EXISTS idx_markets_expires_at ON markets(expires_at);
CREATE INDEX IF NOT EXISTS idx_markets_creator_id ON markets(creator_id);

-- Indexes: bets
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_user_market ON bets(user_id, market_id);

-- Indexes: transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Indexes: comments
CREATE INDEX IF NOT EXISTS idx_comments_market_id ON comments(market_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Indexes: leaderboard_scores
CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_score_desc ON leaderboard_scores(score DESC);

-- Helper function to identify app admins
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND rank = 'Legend'
  );
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- users policies: select/update own row only
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- categories policies: read for all authenticated/anon users
DROP POLICY IF EXISTS categories_select_all ON categories;
CREATE POLICY categories_select_all ON categories
  FOR SELECT
  USING (true);

-- markets policies
DROP POLICY IF EXISTS markets_select_open_or_resolved ON markets;
CREATE POLICY markets_select_open_or_resolved ON markets
  FOR SELECT
  USING (status IN ('OPEN', 'RESOLVED'));

DROP POLICY IF EXISTS markets_insert_authenticated ON markets;
CREATE POLICY markets_insert_authenticated ON markets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

DROP POLICY IF EXISTS markets_update_owner_or_admin ON markets;
CREATE POLICY markets_update_owner_or_admin ON markets
  FOR UPDATE
  USING (creator_id = auth.uid() OR is_admin_user())
  WITH CHECK (creator_id = auth.uid() OR is_admin_user());

-- bets policies
DROP POLICY IF EXISTS bets_select_own ON bets;
CREATE POLICY bets_select_own ON bets
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS bets_insert_own ON bets;
CREATE POLICY bets_insert_own ON bets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- transactions policies
DROP POLICY IF EXISTS transactions_select_own ON transactions;
CREATE POLICY transactions_select_own ON transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- comments policies
DROP POLICY IF EXISTS comments_select_all ON comments;
CREATE POLICY comments_select_all ON comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS comments_insert_authenticated ON comments;
CREATE POLICY comments_insert_authenticated ON comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS comments_delete_own ON comments;
CREATE POLICY comments_delete_own ON comments
  FOR DELETE
  USING (user_id = auth.uid());

-- leaderboard_scores policies
DROP POLICY IF EXISTS leaderboard_select_all ON leaderboard_scores;
CREATE POLICY leaderboard_select_all ON leaderboard_scores
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS leaderboard_update_service_role_only ON leaderboard_scores;
CREATE POLICY leaderboard_update_service_role_only ON leaderboard_scores
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS leaderboard_insert_service_role_only ON leaderboard_scores;
CREATE POLICY leaderboard_insert_service_role_only ON leaderboard_scores
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- admin_logs policies
DROP POLICY IF EXISTS admin_logs_select_admin ON admin_logs;
CREATE POLICY admin_logs_select_admin ON admin_logs
  FOR SELECT
  USING (is_admin_user());

DROP POLICY IF EXISTS admin_logs_insert_admin ON admin_logs;
CREATE POLICY admin_logs_insert_admin ON admin_logs
  FOR INSERT
  WITH CHECK (is_admin_user());
