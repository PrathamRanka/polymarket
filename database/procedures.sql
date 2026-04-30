-- PredictMarket procedures, functions, and triggers

BEGIN;

CREATE OR REPLACE FUNCTION calculate_probability(yes_vol NUMERIC, no_vol NUMERIC)
RETURNS NUMERIC(5,4)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_ratio NUMERIC(10,6);
BEGIN
  IF yes_vol = 0 AND no_vol = 0 THEN
    RETURN 0.5000;
  END IF;

  v_ratio := yes_vol / NULLIF(yes_vol + no_vol, 0);
  v_ratio := GREATEST(0.01, LEAST(0.99, v_ratio));
  RETURN v_ratio::NUMERIC(5,4);
END;
$$;

CREATE OR REPLACE FUNCTION calculate_shares(amount NUMERIC, probability NUMERIC, side TEXT)
RETURNS NUMERIC(12,4)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_shares NUMERIC(20,8);
BEGIN
  IF side = 'YES' THEN
    v_shares := amount / NULLIF(probability, 0);
  ELSIF side = 'NO' THEN
    v_shares := amount / NULLIF(1 - probability, 0);
  ELSE
    RAISE EXCEPTION 'Invalid side: %', side;
  END IF;

  RETURN GREATEST(0.0001, v_shares)::NUMERIC(12,4);
END;
$$;

CREATE OR REPLACE FUNCTION trg_deduct_wallet_on_bet()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance NUMERIC(12,2);
BEGIN
  SELECT wallet_balance
  INTO v_balance
  FROM users
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User % not found', NEW.user_id;
  END IF;

  IF v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient funds: balance=%, required=%', v_balance, NEW.amount
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE users
  SET wallet_balance = wallet_balance - NEW.amount
  WHERE id = NEW.user_id;

  INSERT INTO transactions (user_id, type, amount, reference_id, description)
  VALUES (
    NEW.user_id,
    'BET_PLACED',
    -NEW.amount,
    NEW.id,
    'Bet placed on market ' || NEW.market_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_bets_deduct_wallet ON bets;
CREATE TRIGGER before_insert_bets_deduct_wallet
BEFORE INSERT ON bets
FOR EACH ROW
EXECUTE FUNCTION trg_deduct_wallet_on_bet();

CREATE OR REPLACE PROCEDURE resolve_market(p_market_id UUID, p_winning_side TEXT, p_admin_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_winning_pool NUMERIC(14,2) := 0;
  v_loser_pool NUMERIC(14,2) := 0;
  v_bet RECORD;
  v_payout NUMERIC(14,2);
BEGIN
  RAISE NOTICE 'resolve_market start: market_id=%, winning_side=%, admin_id=%', p_market_id, p_winning_side, p_admin_id;

  IF p_winning_side NOT IN ('YES', 'NO') THEN
    RAISE EXCEPTION 'Invalid winning side: %', p_winning_side;
  END IF;

  SELECT status
  INTO v_status
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Market % not found', p_market_id;
  END IF;

  IF v_status != 'OPEN' AND v_status != 'CLOSED' THEN
    RAISE EXCEPTION 'Market % cannot be resolved (status: %)', p_market_id, v_status;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_winning_pool
  FROM bets
  WHERE market_id = p_market_id
    AND side = p_winning_side
    AND status = 'OPEN';

  SELECT COALESCE(SUM(amount), 0)
  INTO v_loser_pool
  FROM bets
  WHERE market_id = p_market_id
    AND side != p_winning_side
    AND status = 'OPEN';

  RAISE NOTICE 'Pools: winning=%, loser=%', v_winning_pool, v_loser_pool;

  FOR v_bet IN
    SELECT *
    FROM bets
    WHERE market_id = p_market_id
      AND side = p_winning_side
      AND status = 'OPEN'
  LOOP
    v_payout := v_bet.amount + (
      v_bet.amount / NULLIF(v_winning_pool, 0) * v_loser_pool * 0.95
    );

    UPDATE users
    SET wallet_balance = wallet_balance + v_payout
    WHERE id = v_bet.user_id;

    UPDATE bets
    SET status = 'WON',
        potential_payout = v_payout
    WHERE id = v_bet.id;

    INSERT INTO transactions (user_id, type, amount, reference_id, description)
    VALUES (
      v_bet.user_id,
      'BET_WON',
      v_payout,
      v_bet.id,
      'Won bet on market ' || p_market_id
    );

    INSERT INTO leaderboard_scores (user_id, wins, total_wagered, score)
    VALUES (v_bet.user_id, 1, v_bet.amount, v_payout - v_bet.amount)
    ON CONFLICT (user_id) DO UPDATE
    SET wins = leaderboard_scores.wins + 1,
        total_wagered = leaderboard_scores.total_wagered + v_bet.amount,
        score = leaderboard_scores.score + (v_payout - v_bet.amount),
        updated_at = NOW();
  END LOOP;

  UPDATE bets
  SET status = 'LOST'
  WHERE market_id = p_market_id
    AND side != p_winning_side
    AND status = 'OPEN';

  UPDATE leaderboard_scores ls
  SET losses = ls.losses + subq.loss_count,
      total_wagered = ls.total_wagered + subq.total_amount,
      updated_at = NOW()
  FROM (
    SELECT user_id, COUNT(*) AS loss_count, COALESCE(SUM(amount), 0) AS total_amount
    FROM bets
    WHERE market_id = p_market_id
      AND status = 'LOST'
    GROUP BY user_id
  ) subq
  WHERE ls.user_id = subq.user_id;

  UPDATE markets
  SET status = 'RESOLVED',
      resolution_side = p_winning_side
  WHERE id = p_market_id;

  INSERT INTO admin_logs (admin_id, action, target_id, metadata)
  VALUES (
    p_admin_id,
    'RESOLVE_MARKET',
    p_market_id,
    jsonb_build_object(
      'winning_side', p_winning_side,
      'winning_pool', v_winning_pool,
      'loser_pool', v_loser_pool
    )
  );

  RAISE NOTICE 'resolve_market complete: market_id=%', p_market_id;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'resolve_market failed: %', SQLERRM;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION get_leaderboard_report(p_limit INT DEFAULT 100)
RETURNS TABLE (
  rank INT,
  username TEXT,
  score NUMERIC,
  wins INT,
  losses INT,
  win_rate NUMERIC,
  streak INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  c_leaderboard CURSOR FOR
    SELECT
      ROW_NUMBER() OVER (ORDER BY ls.score DESC) AS rnk,
      u.username,
      ls.score,
      ls.wins,
      ls.losses,
      CASE
        WHEN (ls.wins + ls.losses) = 0 THEN 0
        ELSE ls.wins::NUMERIC / (ls.wins + ls.losses)
      END AS calc_win_rate,
      u.streak_count
    FROM leaderboard_scores ls
    JOIN users u ON u.id = ls.user_id
    ORDER BY ls.score DESC
    LIMIT LEAST(COALESCE(p_limit, 100), 100);
BEGIN
  OPEN c_leaderboard;
  LOOP
    FETCH c_leaderboard INTO v_row;
    EXIT WHEN NOT FOUND;

    rank := v_row.rnk;
    username := v_row.username;
    score := v_row.score;
    wins := v_row.wins;
    losses := v_row.losses;
    win_rate := v_row.calc_win_rate;
    streak := v_row.streak_count;

    RETURN NEXT;
  END LOOP;

  CLOSE c_leaderboard;
END;
$$;

CREATE OR REPLACE FUNCTION award_signup_bonus(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'award_signup_bonus: user_id=%', p_user_id;

  UPDATE users
  SET wallet_balance = wallet_balance + 1000
  WHERE id = p_user_id;

  INSERT INTO transactions (user_id, type, amount, reference_id, description)
  VALUES (
    p_user_id,
    'SIGNUP_BONUS',
    1000,
    p_user_id,
    'Signup bonus awarded'
  );
END;
$$;

COMMIT;

-- Sanity test calls (safe no-op wrappers)
DO $$
BEGIN
  RAISE NOTICE 'calculate_probability(0,0) => %', calculate_probability(0, 0);
  RAISE NOTICE 'calculate_probability(80,20) => %', calculate_probability(80, 20);
  RAISE NOTICE 'calculate_shares(100,0.6,''YES'') => %', calculate_shares(100, 0.6, 'YES');
END;
$$;
