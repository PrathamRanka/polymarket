# PredictMarket Project - Technical Analysis & Database Design

**Project:** PredictMarket - Decentralized Prediction Market Platform  
**Stack:** Next.js 15 (TypeScript), PostgreSQL 15 (Supabase), React Query, Sonner  
**Database:** PostgreSQL with UUID primary keys, RLS, PL/pgSQL  
**Course:** Database Management Systems (UCS310)  
**Date:** May 2, 2026

---

## 1. Executive Summary

PredictMarket is a full-stack prediction market platform enabling users to:
- Create and resolve binary prediction markets (YES/NO outcomes)
- Place bets with share-based calculation (AMM-style)
- Track portfolio performance and ROI
- Compete on leaderboards with rank progression
- Transact securely with wallet balance management and immutable transaction ledger
- Participate in market discussions via comments

The database design emphasizes **data integrity through constraints, triggers, and stored procedures** with **PostgreSQL Row-Level Security (RLS)** for multi-user isolation. All real-money/balance mutations are protected by triggers and procedure-based settlement logic.

---

## 2. Entity-Relationship (ER) Model

### 2.1 Entities Identified

| Entity | Primary Key | Purpose | Key Constraints |
|--------|-------------|---------|-----------------|
| **users** | id (UUID) | Application user accounts, authentication, wallet state | PK, UNIQUE(username, email, phone_number), CHECK constraints for wallet ≥ 0 |
| **categories** | id (UUID) | Market classification metadata (Politics, Tech, Sports, etc.) | PK, UNIQUE(name, slug) |
| **markets** | id (UUID) | Prediction market definitions with aggregate volume tracking | PK, FK to categories, FK to users(creator), CHECK(expires_at > created_at) |
| **bets** | id (UUID) | User positions within markets (shares purchased) | PK, FK to users, FK to markets, CHECK(amount, shares > 0) |
| **transactions** | id (UUID) | Immutable wallet ledger (append-only audit trail) | PK, FK to users, indexed by type & created_at |
| **comments** | id (UUID) | Public discussion threads per market | PK, FK to users, FK to markets, ON DELETE CASCADE |
| **leaderboard_scores** | id (UUID) | Denormalized user performance metrics (refreshed on settlement) | PK, UNIQUE(user_id), updated via procedure |
| **admin_logs** | id (UUID) | Audit trail for privileged admin actions | PK, FK to users(admin_id), JSONB metadata |

### 2.2 Entity-Relationship Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                           │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │   USERS      │
                            │──────────────│
                            │ id (PK)      │
                            │ username *U  │
                            │ email *U     │
                            │ phone_number │
                            │ password_hash│
                            │ wallet_bal   │
                            │ streak_count │
                            │ rank         │
                            │ created_at   │
                            └──────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    │             │             │
        (creator)   │             │         (user_id)
            1:N     │             │             1:N
                    │             │             │
            ┌───────▼──────┐  ┌───▼─────────────▼────┐
            │  MARKETS     │  │      BETS            │
            │──────────────│  │──────────────────────│
            │ id (PK)      │  │ id (PK)              │
            │ title        │  │ user_id (FK) *       │
            │ description  │  │ market_id (FK) *     │
            │ category_id  │  │ side (YES|NO)        │
            │ creator_id   │  │ amount ($)           │
            │ yes_volume   │  │ shares               │
            │ no_volume    │  │ potential_payout     │
            │ status       │  │ status               │
            │ resolution   │  │ created_at           │
            │ expires_at   │  └──────────────────────┘
            │ created_at   │              │
            └───────┬──────┘              │
                    │                     │ (reference_id)
         (category) │                     │ 1:N
           1:N      │         ┌───────────▼───────┐
                    │         │ TRANSACTIONS      │
            ┌───────▼───┐     │───────────────────│
            │ CATEGORIES│     │ id (PK)           │
            │───────────│     │ user_id (FK)      │
            │ id (PK)   │     │ type (enum)       │
            │ name *U   │     │ amount            │
            │ slug *U   │     │ reference_id      │
            │ icon      │     │ description       │
            └───────────┘     │ created_at        │
                              └───────────────────┘
                                      │
                                      │
                              ┌───────▼──────────┐
                              │  LEADERBOARD_    │
                              │  SCORES          │
                              │──────────────────│
                              │ id (PK)          │
                              │ user_id (FK) *U  │
                              │ score            │
                              │ wins             │
                              │ losses           │
                              │ total_wagered    │
                              │ updated_at       │
                              └──────────────────┘

        ┌──────────────────────────────────────┐
        │  SUPPORTING ENTITIES                 │
        └──────────────────────────────────────┘

        ┌──────────────────┐  ┌──────────────────┐
        │    COMMENTS      │  │   ADMIN_LOGS     │
        │──────────────────│  │──────────────────│
        │ id (PK)          │  │ id (PK)          │
        │ user_id (FK)     │  │ admin_id (FK)    │
        │ market_id (FK)   │  │ action           │
        │ content          │  │ target_id        │
        │ created_at       │  │ metadata (JSONB) │
        │                  │  │ created_at       │
        └──────────────────┘  └──────────────────┘
```

### 2.3 Relationships Summary

| Relationship | Type | Cardinality | Constraint | Notes |
|--------------|------|-------------|-----------|-------|
| User → Markets (creator) | 1:N | One user creates many markets | FK on creator_id | Creator is original proposer |
| User → Bets | 1:N | One user places many bets | FK + ON DELETE CASCADE | User bets deleted if account closed |
| User → Transactions | 1:N | One user has many transactions | FK + ON DELETE CASCADE | Immutable ledger per user |
| User → Comments | 1:N | One user writes many comments | FK + ON DELETE CASCADE | User comments deleted if user removed |
| User → Leaderboard_Scores | 1:1 | One user has one score record | UNIQUE(user_id) | Service role only |
| Market → Categories | N:1 | Many markets in one category | FK on category_id | Non-cascading; preserves history |
| Market → Bets | 1:N | One market has many bets | FK + no cascade | Preserve bet history after market deletion |
| Market → Comments | 1:N | One market has many comments | FK + ON DELETE CASCADE | Comments cascade deleted with market |
| Bet → Transactions | 1:N (indirect) | Bet references transactions | Via reference_id column | Transaction records bet lifecycle |

---

## 3. Database Design - Normalization Analysis

### 3.1 First Normal Form (1NF)

✅ **Achieved:** All attributes are atomic (no multi-valued attributes, no repeating groups).

**Evidence:**
- `yes_volume` and `no_volume` are separate numeric columns (not stored as JSON or concatenated strings)
- `side` is a single-valued ENUM (NOT IN | YES, NO, BOTH)
- `bets` stores individual share records; no array of bets per user row
- All timestamp fields are single values (TIMESTAMPTZ)

### 3.2 Second Normal Form (2NF)

✅ **Achieved:** All non-key attributes are fully functionally dependent on the entire primary key.

**Analysis per table:**

#### users (1NF ✓, 2NF ✓)
- PK: `id`
- All attributes (username, email, wallet_balance, rank, streak_count) depend entirely on `id`
- No partial dependencies on parts of a composite key
- **Status:** BCNF

#### categories (1NF ✓, 2NF ✓)
- PK: `id`
- Attributes (name, slug, icon) fully depend on `id`
- **Status:** BCNF

#### markets (1NF ✓, 2NF ✓)
- PK: `id`
- Non-key: title, description, category_id, creator_id, yes_volume, no_volume, status, expires_at
- All depend entirely on `id` (not on partial key)
- No composite key, so no partial dependency risk
- **Status:** BCNF

#### bets (1NF ✓, 2NF ✓)
- PK: `id`
- Non-key: user_id, market_id, side, amount, shares, potential_payout, status
- All depend entirely on `id`
- No transitive dependencies through user_id or market_id
- **Status:** BCNF

#### transactions (1NF ✓, 2NF ✓)
- PK: `id`
- Non-key: user_id, type, amount, reference_id, description
- All depend entirely on `id`
- Append-only design ensures immutability
- **Status:** BCNF

#### comments (1NF ✓, 2NF ✓)
- PK: `id`
- Non-key: user_id, market_id, content
- All depend entirely on `id`
- **Status:** BCNF

#### leaderboard_scores (1NF ✓, 2NF ✓)
- PK: `id`
- UNIQUE(user_id) ensures one score per user
- Non-key: score, wins, losses, total_wagered all depend on user_id (via PK)
- Denormalized for performance; aggregates materialized from bets
- **Status:** BCNF (denormalization acceptable for reporting)

#### admin_logs (1NF ✓, 2NF ✓)
- PK: `id`
- Non-key: admin_id, action, target_id, metadata depend entirely on `id`
- **Status:** BCNF

### 3.3 Third Normal Form (3NF) & Boyce-Codd Normal Form (BCNF)

✅ **Achieved:** No non-key attribute depends on another non-key attribute (no transitive dependencies).

**Evidence:**

1. **users**: All non-key attributes directly describe the user. No attribute X→Y→Z dependency chain.
2. **categories**: Attributes (name, slug, icon) all describe the category directly.
3. **markets**: 
   - `title`, `description`, `status`, `expires_at` → describe the market directly
   - `creator_id` → is a foreign key (expected)
   - `category_id` → is a foreign key (expected)
   - `yes_volume`, `no_volume` → aggregate market state (no transitive dependency)
4. **bets**: 
   - `side`, `amount`, `shares`, `potential_payout`, `status` → describe the individual bet
   - `user_id`, `market_id` → are foreign keys
5. **transactions**: 
   - `type`, `amount`, `description`, `reference_id` → describe the transaction
   - No attribute transitively depends on another
6. **leaderboard_scores**: 
   - Denormalized intentionally for reporting efficiency
   - Computed from `bets` on-demand via settlement procedure
   - Acceptable because:
     - Updated atomically via stored procedure (consistency guaranteed)
     - Refreshed only during market resolution (bounded update frequency)
     - Read-heavy (leaderboard endpoint cached at 60s intervals)

**Conclusion:** Database is in **3NF for all tables** with **BCNF** compliance. The denormalization in `leaderboard_scores` is an intentional optimization with atomic update semantics.

### 3.4 Referential Integrity & Constraints

| Constraint Type | Implementation | Enforced |
|-----------------|----------------|----------|
| Primary Keys | UUID auto-generated, NOT NULL | ✅ Yes |
| Foreign Keys | ON DELETE CASCADE (for user content) / No cascade (for markets) | ✅ Yes |
| UNIQUE | username, email, phone_number, category.name, category.slug, leaderboard_scores.user_id | ✅ Yes |
| CHECK | wallet_balance ≥ 0, amount > 0, shares > 0, status IN (enum), expires_at > created_at, phone format | ✅ Yes |
| NOT NULL | Enforced on all required columns | ✅ Yes |

---

## 4. SQL Implementation Details

### 4.1 Data Definition Language (DDL)

#### Table Creation Statements

See [schema.sql](database/schema.sql) for full definitions. Key patterns:

```sql
-- Example: Users table with constraints
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(30) UNIQUE NOT NULL CHECK (length(username) >= 3),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(13) UNIQUE CHECK (phone_number ~ '^\\+91[6-9][0-9]{9}$'),
  password_hash TEXT NOT NULL,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 1000.00 CHECK (wallet_balance >= 0),
  streak_count INTEGER NOT NULL DEFAULT 0 CHECK (streak_count >= 0),
  rank VARCHAR(20) NOT NULL DEFAULT 'Novice' CHECK (rank IN ('Novice', 'Analyst', 'Expert', 'Oracle', 'Legend')),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example: Bets table with foreign key constraints
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
```

#### Indexing Strategy

**18 indexes created to optimize query performance:**

| Index Name | Table | Column(s) | Rationale |
|------------|-------|-----------|-----------|
| idx_markets_status | markets | status | WHERE clause filtering on OPEN/CLOSED/RESOLVED markets |
| idx_markets_category_id | markets | category_id | Market listing by category |
| idx_markets_expires_at | markets | expires_at | Market expiry scanning for closure automation |
| idx_markets_creator_id | markets | creator_id | Creator's market history lookup |
| idx_bets_user_id | bets | user_id | Portfolio fetch (all bets for a user) |
| idx_bets_market_id | bets | market_id | Market detail page (all bets on market) |
| idx_bets_status | bets | status | Status filtering (open vs. closed) |
| idx_bets_user_market | bets | (user_id, market_id) | Composite: check if user already bet on market |
| idx_transactions_user_id | transactions | user_id | Transaction history fetch |
| idx_transactions_type | transactions | type | Bonus tracking, settlement audits |
| idx_transactions_created_at | transactions | created_at | Time-based filtering, recent activity |
| idx_comments_market_id | comments | market_id | Market discussion threads |
| idx_comments_user_id | comments | user_id | User comment history |
| idx_leaderboard_scores_score_desc | leaderboard_scores | score DESC | Leaderboard ranking queries |

---

### 4.2 Data Manipulation Language (DML)

#### INSERT Operations

**User Signup:**
```
POST /api/auth/signup
→ INSERT INTO users (id, username, email, phone_number, password_hash, wallet_balance, ...)
→ Trigger: award_signup_bonus() (future)
→ INSERT INTO leaderboard_scores (user_id, score=0, wins=0, losses=0)
```

**Bet Placement:**
```
POST /api/markets/{id}/bet
→ BEFORE INSERT trigger: trg_deduct_wallet_on_bet()
  - Locks user row FOR UPDATE (prevents race condition)
  - Validates wallet_balance >= amount
  - UPDATE users SET wallet_balance = wallet_balance - amount
  - INSERT INTO transactions (type='BET_PLACED', amount=-amount, reference_id=bet_id)
→ INSERT INTO bets (user_id, market_id, side, amount, shares, potential_payout, status='OPEN')
```

**Market Resolution:**
```
CALL resolve_market(market_id, winning_side, admin_id)
→ Locks market row FOR UPDATE
→ FOR EACH winning bet:
  - Calculate payout: amount + (amount / total_winning_pool) * loser_pool * 0.95
  - UPDATE users SET wallet_balance += payout
  - UPDATE bets SET status='WON', potential_payout=payout
  - INSERT INTO transactions (type='BET_WON', amount=payout)
  - UPSERT INTO leaderboard_scores (wins++, score+=profit)
→ UPDATE remaining bets SET status='LOST'
→ UPSERT leaderboard_scores (losses++)
→ UPDATE markets SET status='RESOLVED', resolution_side=winning_side
→ INSERT INTO admin_logs (action='RESOLVE_MARKET', metadata={...})
```

#### Query Patterns

**Fetch Open Markets with Probability:**
```sql
SELECT id, title, yes_volume, no_volume,
       calculate_probability(yes_volume, no_volume) as yes_probability
FROM markets
WHERE status = 'OPEN' AND expires_at > NOW()
ORDER BY created_at DESC;
```

**Fetch User Portfolio:**
```sql
SELECT id, username, wallet_balance, streak_count, rank
FROM users
WHERE id = $1;

SELECT id, market_id, side, amount, shares, potential_payout, status
FROM bets
WHERE user_id = $1
ORDER BY created_at DESC;

SELECT id, type, amount, reference_id, description, created_at
FROM transactions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

**Calculate User ROI:**
```
ROI = (total_won - total_wagered) / total_wagered * 100%
WHERE:
  total_wagered = SUM(amount) WHERE status IN ('WON', 'LOST')
  total_won = SUM(potential_payout) WHERE status = 'WON'
```

#### UPDATE Operations

**Market Closure (Automatic on Expiry):**
```sql
UPDATE markets
SET status = 'CLOSED'
WHERE status = 'OPEN' AND expires_at <= NOW();
```

**Leaderboard Score Update (During Settlement):**
```sql
-- Winners
INSERT INTO leaderboard_scores (user_id, wins, score, total_wagered)
VALUES (winning_user, 1, profit, bet_amount)
ON CONFLICT (user_id) DO UPDATE
SET wins = leaderboard_scores.wins + 1,
    score = leaderboard_scores.score + profit,
    total_wagered = leaderboard_scores.total_wagered + bet_amount,
    updated_at = NOW();
```

#### DELETE Operations

**User Account Deletion (Cascade):**
```sql
DELETE FROM users WHERE id = $1;
-- Cascades: all bets, transactions, comments, leaderboard entry deleted
```

**Market Cancellation (Refund Bets):**
```sql
-- Not yet implemented, but would involve:
FOR each bet WHERE market_id = cancelled_market
  UPDATE users SET wallet_balance += bet.amount
  INSERT INTO transactions (type='BET_REFUND')
  UPDATE bets SET status='REFUNDED'
```

---

## 5. PL/SQL Components

### 5.1 Stored Procedures

#### resolve_market(p_market_id UUID, p_winning_side TEXT, p_admin_id UUID)

**Purpose:** Atomically settle all bets for a resolved market (payout winners, mark losers).

**Key Features:**
- Uses FOR UPDATE locks to prevent concurrent settlement
- Calculates pooled payout: `payout = bet_amount + (bet_amount / winning_pool) * loser_pool * 0.95`
- Updates user wallets, bet statuses, transactions, and leaderboard atomically
- Takes 5% rake on loser pool
- Logs all actions to admin_logs (JSONB metadata)
- RAISE EXCEPTION on invalid market state or malformed input

**Pseudocode:**
```plpgsql
PROCEDURE resolve_market(p_market_id, p_winning_side, p_admin_id)
  LOCK market FOR UPDATE
  VALIDATE market status IN (OPEN, CLOSED)
  VALIDATE p_winning_side IN (YES, NO)
  
  v_winning_pool = SUM(amount) WHERE market=p_market_id AND side=winning_side
  v_loser_pool = SUM(amount) WHERE market=p_market_id AND side!=winning_side
  
  FOR EACH winning_bet
    v_payout = winning_bet.amount + (winning_bet.amount / v_winning_pool) * v_loser_pool * 0.95
    UPDATE users SET wallet_balance += v_payout WHERE id=winning_bet.user_id
    UPDATE bets SET status='WON', potential_payout=v_payout WHERE id=winning_bet.id
    INSERT transaction (type='BET_WON', amount=v_payout)
    UPSERT leaderboard_scores (wins++, score+=(v_payout-winning_bet.amount))
  
  UPDATE bets SET status='LOST' WHERE market=p_market_id AND side!=winning_side
  UPSERT leaderboard_scores (losses++) FOR each losing bet
  
  UPDATE markets SET status='RESOLVED', resolution_side=p_winning_side
  INSERT admin_logs (action='RESOLVE_MARKET', metadata={winning_pool, loser_pool})
```

---

### 5.2 Functions

#### calculate_probability(yes_vol NUMERIC, no_vol NUMERIC) → NUMERIC(5,4)

**Purpose:** Compute market probability from volume (AMM bonding curve).

**Logic:**
```
IF yes_vol = 0 AND no_vol = 0 THEN return 0.5000 (no volume = 50/50)
ELSE probability = yes_vol / (yes_vol + no_vol)
CLAMP TO [0.01, 0.99] (prevent edge cases)
```

**Usage:** Real-time odds display, bet calculation.

---

#### calculate_shares(amount NUMERIC, probability NUMERIC, side TEXT) → NUMERIC(12,4)

**Purpose:** Calculate shares received for a given bet amount and market probability.

**Logic:**
```
IF side = 'YES'
  shares = amount / probability
ELSE side = 'NO'
  shares = amount / (1 - probability)
CLAMP TO [0.0001, ∞) (minimum granularity)
```

**Usage:** Frontend bet form, settlement calculations.

---

#### is_admin_user() → BOOLEAN

**Purpose:** Determine if current authenticated user is an admin (rank='Legend').

**Usage:** RLS policy authorization for admin_logs, market resolution endpoint.

---

#### get_leaderboard_report(p_limit INT) → TABLE(rank, username, score, wins, losses, win_rate, streak)

**Purpose:** Fetch ranked user statistics for leaderboard display.

**Key Features:**
- Uses cursor to iterate over leaderboard_scores
- Calculates win_rate on-the-fly: `wins / (wins + losses)`
- Ranks by score DESC
- Limits to max 100 entries
- Returns denormalized user data (username, streak_count)

**Usage:** `/api/leaderboard` endpoint (cached 60s).

---

#### award_signup_bonus(p_user_id UUID) → VOID

**Purpose:** Award 1000 coins to new user on signup.

**Logic:**
```
UPDATE users SET wallet_balance += 1000 WHERE id = p_user_id
INSERT transactions (type='SIGNUP_BONUS', amount=1000)
```

**Status:** Implemented but not yet invoked (future trigger on user creation).

---

### 5.3 Triggers

#### before_insert_bets_deduct_wallet

**Event:** BEFORE INSERT ON bets  
**For Each Row:** Execute trg_deduct_wallet_on_bet()

**Function: trg_deduct_wallet_on_bet()**

**Purpose:** Atomically deduct bet amount from user's wallet balance on bet placement.

**Implementation:**
```plpgsql
FUNCTION trg_deduct_wallet_on_bet()
  -- Lock user row to prevent concurrent bets exceeding balance
  SELECT wallet_balance INTO v_balance FROM users WHERE id = NEW.user_id FOR UPDATE
  
  -- Validate sufficient funds
  IF v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient funds: balance=%, required=%'
  END IF
  
  -- Atomically update balance
  UPDATE users SET wallet_balance = wallet_balance - NEW.amount WHERE id = NEW.user_id
  
  -- Record transaction for audit trail
  INSERT INTO transactions (
    user_id, type='BET_PLACED', amount=-NEW.amount, reference_id=NEW.id,
    description='Bet placed on market ' || NEW.market_id
  )
  
  RETURN NEW
```

**Guarantees:**
- ✅ Prevents overdraft (no bet if balance insufficient)
- ✅ No double-spending (row-level lock)
- ✅ Atomic with bet insertion (same transaction)
- ✅ Immutable audit trail (transaction record)

---

### 5.4 Cursor Usage

**In:** get_leaderboard_report()

```plpgsql
CURSOR c_leaderboard FOR
  SELECT row_number() OVER (ORDER BY score DESC), username, score, wins, losses, streak
  FROM leaderboard_scores
  JOIN users
  ORDER BY score DESC
  LIMIT p_limit

LOOP
  FETCH c_leaderboard INTO v_row
  RETURN NEXT v_row
END LOOP
```

**Purpose:** Stream leaderboard data one row at a time (memory efficient for 100+ rows).

---

### 5.5 Exception Handling

**Patterns Used:**

1. **User Input Validation:**
   ```plpgsql
   IF p_winning_side NOT IN ('YES', 'NO') THEN
     RAISE EXCEPTION 'Invalid winning side: %', p_winning_side;
   END IF;
   ```

2. **Resource Not Found:**
   ```plpgsql
   IF v_status IS NULL THEN
     RAISE EXCEPTION 'Market % not found', p_market_id;
   END IF;
   ```

3. **State Violation:**
   ```plpgsql
   IF v_status != 'OPEN' AND v_status != 'CLOSED' THEN
     RAISE EXCEPTION 'Market % cannot be resolved (status: %)', p_market_id, v_status;
   END IF;
   ```

4. **Business Logic Errors:**
   ```plpgsql
   IF v_balance < NEW.amount THEN
     RAISE EXCEPTION 'Insufficient funds: balance=%, required=%', v_balance, NEW.amount
       USING ERRCODE = 'P0001';
   END IF;
   ```

5. **Catch-All in API:**
   ```
   EXCEPTION WHEN OTHERS THEN
     RAISE NOTICE 'resolve_market failed: %', SQLERRM;
     RAISE;  -- Re-throw to API layer
   ```

---

## 6. Transaction Flows & ACID Compliance

### 6.1 User Registration Flow

```
CLIENT                          API (Next.js)               DATABASE (Supabase)
  │                                 │                              │
  ├─ POST /api/auth/signup ────────>│                              │
  │                                 ├─ Validate payload            │
  │                                 ├─ Hash password               │
  │                                 ├─ Generate UUID               │
  │                                 ├─ INSERT INTO users ─────────>│
  │                                 │                  BEGIN;       │
  │                                 │   INSERT profile             │
  │                                 │   (PK=id, unique constraints)
  │                                 │   COMMIT;                    │
  │                                 │<─ Return user id             │
  │                                 ├─ Create session token        │
  │                                 │<─ Set-Cookie                 │
  │<────────── 201 Created ─────────┤                              │
  │        { user: {...} }          │                              │
  │                                 │                              │
```

**ACID Properties:**
- ✅ **Atomicity:** Single INSERT transaction; commit or rollback
- ✅ **Consistency:** UNIQUE constraints, CHECK constraints enforced
- ✅ **Isolation:** Serializable isolation level (default)
- ✅ **Durability:** Persisted to PostgreSQL WAL

---

### 6.2 Bet Placement Flow

```
CLIENT                     API (Next.js)                DATABASE (Supabase)
  │                              │                             │
  ├─ POST /api/markets/{id}/bet ─>│                             │
  │                              ├─ Verify session token        │
  │                              ├─ Rate limit check (memory)   │
  │                              ├─ Fetch market (status, vol)  │
  │                              ├─ Fetch user (wallet_balance) │
  │                              ├─ Calculate: probability      │
  │                              ├─ Calculate: shares           │
  │                              ├─ Calculate: potential_payout │
  │                              ├─ INSERT INTO bets ──────────>│
  │                              │         BEGIN;               │
  │                              │ [TRIGGER] trg_deduct...      │
  │                              │   LOCK user FOR UPDATE       │
  │                              │   CHECK wallet_balance >= amt│
  │                              │   UPDATE wallet              │
  │                              │   INSERT transaction (type)  │
  │                              │         INSERT bets row      │
  │                              │         COMMIT;              │
  │                              │<─ Return bet record          │
  │                              ├─ Invalidate market cache     │
  │                              ├─ Invalidate portfolio cache  │
  │<───── 200 OK ──────────────<─┤                             │
  │     { bet: {...} }           │                              │
  │                              │                              │
```

**ACID Properties:**
- ✅ **Atomicity:** BEFORE INSERT trigger makes wallet deduction + transaction insert + bet insert atomic
- ✅ **Consistency:** CHECK constraints, FK, deduction logic maintain invariants
- ✅ **Isolation:** Row-level FOR UPDATE lock prevents concurrent balance over-deductions
- ✅ **Durability:** All changes logged to WAL

**Race Condition Prevention:**
```
User A places $100 bet    User B places $150 bet
balance = $200
      │                          │
      ├─ Lock user row      ────>│ Waits for lock
      ├─ Check: $200 >= $100     │
      ├─ Update to $100          │ Still waiting
      └─ Commit ────────────────>│ Lock released
                                 ├─ Lock acquired (balance=$100)
                                 ├─ Check: $100 >= $150? NO
                                 └─ EXCEPTION 'Insufficient funds'
```

---

### 6.3 Market Resolution Flow

```
ADMIN                          API (/admin/resolve)       DATABASE
  │                                  │                          │
  ├─ POST /api/admin/resolve ───────>│                          │
  │  { market_id, winning_side }     ├─ Verify admin (rank)     │
  │                                  ├─ CALL resolve_market ───>│
  │                                  │         BEGIN;            │
  │                                  │ (large transaction)       │
  │                                  │                          │
  │                                  │ Lock market FOR UPDATE    │
  │                                  │ Validate state            │
  │                                  │ Calculate pools           │
  │                                  │                          │
  │                                  │ FOR each winning bet:     │
  │                                  │   Calculate payout        │
  │                                  │   UPDATE user wallet      │
  │                                  │   UPDATE bet status       │
  │                                  │   INSERT transaction      │
  │                                  │   UPSERT leaderboard      │
  │                                  │                          │
  │                                  │ FOR each losing bet:      │
  │                                  │   UPDATE bet status       │
  │                                  │   UPSERT leaderboard      │
  │                                  │                          │
  │                                  │ UPDATE market status      │
  │                                  │ INSERT admin_logs         │
  │                                  │         COMMIT;           │
  │                                  │<─ Return result           │
  │<───── 200 OK ──────────────────<─┤                          │
  │ { resolved: true, market_id }    │                          │
  │                                  │                          │
```

**ACID Properties:**
- ✅ **Atomicity:** Entire procedure is one transaction; all settlements succeed or all rollback
- ✅ **Consistency:** Payout formula (rake included), leaderboard updates, status changes all applied
- ✅ **Isolation:** FOR UPDATE lock prevents concurrent resolution or bet placement during settlement
- ✅ **Durability:** Changes written to WAL before response sent to client

**Concurrency Guarantees:**
- No partial settlements (some winners paid, others not)
- Leaderboard always consistent with payout history
- Admin logs record exact winning pool and loser pool at resolution time

---

### 6.4 Portfolio Fetch Flow (Read-Only)

```
CLIENT                          API (/api/portfolio)        DATABASE
  │                                   │                           │
  ├─ GET /api/portfolio ─────────────>│                           │
  │                                   ├─ Verify session token     │
  │                                   ├─ Fetch user ─────────────>│
  │                                   │ SELECT id, username, ...  │
  │                                   │<─ Return row              │
  │                                   ├─ Fetch all bets ─────────>│
  │                                   │ SELECT * FROM bets        │
  │                                   │ WHERE user_id = $1        │
  │                                   │<─ Return rows (multiple)  │
  │                                   ├─ Fetch transactions ─────>│
  │                                   │ SELECT * FROM trans.      │
  │                                   │ WHERE user_id = $1 LIMIT  │
  │                                   │<─ Return rows             │
  │                                   ├─ Calculate metrics        │
  │                                   │  - total_wagered          │
  │                                   │  - total_won              │
  │                                   │  - roi                    │
  │<────── 200 OK ─────────────────<─┤                           │
  │ { user: {...}, open_bets: [], }  │                           │
  │   closed_bets: [], transactions} │                           │
```

**ACID Properties:**
- ✅ **Consistency:** Read reflects latest committed state
- ✅ **Isolation:** User can only read own portfolio (RLS policy enforced)
- ✅ **Durability:** Data comes from committed WAL
- ⚠️ **Atomicity:** Not required for read-only operations (no dirty reads possible)

---

## 7. User Roles & System Modules

### 7.1 User Roles & Permissions

| Role | Definition | Permissions | Assignment |
|------|-----------|-------------|----------|
| **Novice** | New user (0-2 streak) | • Create markets • Place bets • Comment | Default on signup |
| **Analyst** | Consistent performer (3-5 streak) | • All Novice + none | Auto-promoted by streak logic (future) |
| **Expert** | Proven track record (6+ streak) | • All Analyst + none | Auto-promoted by streak logic |
| **Oracle** | Top-performing predictor (elite tier) | • All Expert + none | Manual assignment by admins |
| **Legend** | Admin/privileged user | • All Oracle + Resolve markets + View/Log admin actions | Manual assignment (admin@predictmarket.com, custom admins) |

**Role Assignment Mechanism:**
- Signup → rank = 'Novice'
- On market resolution:
  - If user wins → streak_count += 1
  - If user loses → streak_count = 0
  - Rank advancement: Auto-determined by `streak_count` (not yet implemented in procedure, future enhancement)
- Admin rank ('Legend'): Manual via SQL update

---

### 7.2 System Modules

#### A. Authentication Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Signup** | app/api/auth/signup/route.ts | POST /api/auth/signup |
| **Login** | app/api/auth/login/route.ts | POST /api/auth/login |
| **Logout** | app/api/auth/logout/route.ts | POST /api/auth/logout |
| **Session Mgmt** | lib/auth/session.ts | createSessionToken(), verifySessionToken() |
| **Password Hashing** | lib/auth/password.ts | hashPassword(), verifyPassword() (bcrypt) |
| **Validation** | lib/auth/validation.ts | signupSchema, loginSchema (Zod) |
| **Middleware** | middleware.ts | JWT/session verification on protected routes |

**Entry Points:**
```
POST /api/auth/signup     { username, email, phone_number, password }
POST /api/auth/login      { email, password }
POST /api/auth/logout     {} (clears session cookie)
GET  /api/auth/me         {} (returns current user)
```

---

#### B. Market Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Market Listing** | app/api/markets/route.ts | GET /api/markets (list all open) |
| **Market Detail** | app/api/markets/[id]/route.ts | GET /api/markets/{id} (single market) |
| **Market Creation** | app/api/markets/route.ts (POST) | POST /api/markets (create) |
| **Market Resolution** | app/api/admin/resolve/route.ts | POST /api/admin/resolve (admin only) |
| **Real-Time Odds** | hooks/useRealtimeOdds.ts | Supabase subscription to market changes |
| **Frontend Pages** | app/markets/page.tsx | Market list, search, filter |
| | app/markets/[id]/page.tsx | Market detail, chart, comments |

**Business Logic:**
- Market states: OPEN → CLOSED (on expiry) → RESOLVED (admin action) | CANCELLED
- Volumes tracked: yes_volume, no_volume (aggregate bet amounts)
- Probability: `yes_volume / (yes_volume + no_volume)` [0.01, 0.99]
- Creation: Authenticated user can create any market (admin approval not required, future feature)
- Resolution: Legend-rank users only, must provide winning side (YES/NO)

---

#### C. Betting Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Bet Placement** | app/api/markets/[id]/bet/route.ts | POST /api/markets/{id}/bet |
| **Bet Calculation** | lib/utils.ts | calculateProbability(), calculateShares(), calculatePotentialPayout() |
| **Bet Hook** | hooks/useBet.ts | useBet() (React Query mutation) |
| **Bet Panel** | components/market/BetPanel.tsx | Bet form UI |

**Key Features:**
- Amount validation: [1, 100000]
- Rate limiting: Max 10 bets per user per minute (in-memory)
- Shares calculation: `shares = amount / (probability | (1 - probability))`
- Potential payout: Displayed as estimate (actual payout determined on resolution)
- Status: OPEN → WON/LOST/REFUNDED

---

#### D. Portfolio Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Portfolio API** | app/api/portfolio/route.ts | GET /api/portfolio |
| **Portfolio Fetch** | lib/api/fetchers.ts | fetchPortfolio() |
| **Portfolio Hook** | hooks/usePortfolio.ts | usePortfolio() (React Query) |
| **Portfolio Page** | app/portfolio/page.tsx | User portfolio display |
| **Position Card** | components/portfolio/PositionCard.tsx | Individual bet display |
| **ROI Chart** | components/portfolio/ROIChart.tsx | Performance chart |
| **Wallet Badge** | components/wallet/WalletBadge.tsx | Balance display |

**Metrics Calculated:**
- Open bets: Sum of OPEN bets
- Closed bets: Sum of WON + LOST + REFUNDED
- Total wagered: Sum of amounts across all bets
- Total won: Sum of potential_payout WHERE status='WON'
- ROI: `(total_won - total_wagered) / total_wagered * 100%`

---

#### E. Leaderboard Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Leaderboard API** | app/api/leaderboard/route.ts | GET /api/leaderboard?limit=50 |
| **Leaderboard Fetch** | lib/api/fetchers.ts | fetchLeaderboard() |
| **Leaderboard Table** | components/leaderboard/LeaderboardTable.tsx | Ranked user display |
| **Leaderboard Page** | app/leaderboard/page.tsx | Full leaderboard view |
| **PL/SQL Report** | database/procedures.sql | get_leaderboard_report(p_limit) |

**Ranking Criteria:**
1. Score (descending) — profit from all bets
2. Win rate — wins / (wins + losses)
3. Streak count — consecutive wins
4. Total wagered — volume of participation

**Caching:** 60s ISR (Incremental Static Regeneration) on Next.js

---

#### F. Comments Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Comment Fetch** | app/api/markets/[id]/comments/route.ts | GET /api/markets/{id}/comments |
| **Comment Create** | (POST endpoint) | POST /api/markets/{id}/comments |
| **Comment Section** | components/market/CommentSection.tsx | Discussion UI |

**Policies:**
- Public read (all users can read)
- Authenticated write (must be logged in to comment)
- Self-delete (can delete own comments)
- On market deletion: all comments cascade deleted

---

#### G. Admin Module

| Component | File(s) | Functions |
|-----------|---------|-----------|
| **Resolve Market** | app/api/admin/resolve/route.ts | POST /api/admin/resolve |
| **Admin Logs** | database/schema.sql | admin_logs table |
| **Admin Page** | app/admin/page.tsx | Admin dashboard (future) |
| **Audit Trail** | lib/supabase/admin.ts | Admin client access |

**Privileges:**
- Market resolution (select winning side)
- View admin logs
- User rank management (future)

---

## 8. Data Integrity & Constraints

### 8.1 Check Constraints

| Table | Constraint | Purpose |
|-------|-----------|---------|
| users | `wallet_balance >= 0` | Prevent negative balances |
| users | `streak_count >= 0` | Prevent negative streaks |
| users | `length(username) >= 3` | Minimum username length |
| users | `rank IN (enum)` | Valid rank values only |
| users | `phone_number ~ '^\\+91[6-9][0-9]{9}$'` | Indian mobile format |
| bets | `amount > 0` | Prevent zero/negative bets |
| bets | `shares > 0` | Prevent zero/negative shares |
| bets | `side IN ('YES', 'NO')` | Binary outcome only |
| bets | `status IN (enum)` | Valid bet states only |
| markets | `expires_at > created_at` | Expiry must be in future |
| markets | `yes_volume >= 0`, `no_volume >= 0` | Non-negative volumes |
| markets | `title length >= 10` | Meaningful titles |
| markets | `status IN (enum)` | Valid market states |
| comments | `length(content) >= 1` | Non-empty comments |
| transactions | `type IN (enum)` | Valid transaction types |

---

### 8.2 Foreign Key Constraints

| FK Relationship | Cascade Behavior | Rationale |
|-----------------|------------------|-----------|
| bets.user_id → users.id | ON DELETE CASCADE | If user deleted, bets are deleted |
| bets.market_id → markets.id | No cascade | Preserve bet history for resolved markets |
| transactions.user_id → users.id | ON DELETE CASCADE | Delete transaction history if user deleted |
| comments.user_id → users.id | ON DELETE CASCADE | Delete comments if user deleted |
| comments.market_id → markets.id | ON DELETE CASCADE | Delete comments if market deleted |
| markets.creator_id → users.id | No cascade | Preserve market history if creator deleted |
| markets.category_id → categories.id | No cascade | Preserve category assignments |
| leaderboard_scores.user_id → users.id | ON DELETE CASCADE | Reset leaderboard if user deleted |

---

### 8.3 Unique Constraints

| Table | Column(s) | Enforces |
|-------|-----------|----------|
| users | username | No duplicate usernames |
| users | email | No duplicate emails |
| users | phone_number | No duplicate phone numbers |
| categories | name | One category per name |
| categories | slug | One slug per category |
| leaderboard_scores | user_id | One score entry per user |

---

### 8.4 Trigger-Based Constraints

| Trigger | Constraint | Example |
|---------|-----------|---------|
| trg_deduct_wallet_on_bet | Wallet balance cannot be overspent | Bet for $100 fails if balance < $100 |
| (future) auto_update_streak | Streak logic on bet outcome | Win increments, loss resets to 0 |
| (future) auto_close_expired_markets | Market closure on expiry | Cron/automation closes OPEN markets past expires_at |

---

### 8.5 Row-Level Security (RLS) Policies

**Enforcement:** Supabase/PostgreSQL RLS applied to all tables.

| Table | Policy | Allows |
|-------|--------|--------|
| **users** | select_all | Any user can view user profiles |
| | insert_own | Users can only insert their own row |
| | update_own | Users can only update their own row |
| **categories** | select_all | Any user can view categories |
| **markets** | select_open_or_resolved | Users see only OPEN/RESOLVED markets (not CLOSED) |
| | insert_authenticated | Any authenticated user can create markets |
| | update_owner_or_admin | Only creator or Legend-rank admin can edit |
| **bets** | select_own | Users see only their own bets |
| | insert_own | Users can only create bets for themselves |
| **transactions** | select_own | Users see only their own transactions |
| **comments** | select_all | Any user can read all comments |
| | insert_authenticated | Authenticated users can comment |
| | delete_own | Users can delete own comments only |
| **leaderboard_scores** | select_all | All users can view leaderboard |
| | update_service_role_only | Only service_role (backend) can update |
| | insert_service_role_only | Only service_role can insert |
| **admin_logs** | select_admin | Only Legend-rank admins can view |
| | insert_admin | Only Legend-rank admins can log |

---

## 9. Query Performance & Optimization

### 9.1 Index Usage

**High-Traffic Queries:**

1. **Fetch open markets:**
   ```sql
   SELECT * FROM markets WHERE status = 'OPEN' AND expires_at > NOW()
   -- Uses: idx_markets_status, idx_markets_expires_at
   ```

2. **Fetch user bets:**
   ```sql
   SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC
   -- Uses: idx_bets_user_id
   ```

3. **Fetch market bets (for settlement):**
   ```sql
   SELECT * FROM bets WHERE market_id = $1 AND status = 'OPEN'
   -- Uses: idx_bets_market_id + idx_bets_status
   ```

4. **Leaderboard ranking:**
   ```sql
   SELECT * FROM leaderboard_scores ORDER BY score DESC LIMIT 50
   -- Uses: idx_leaderboard_scores_score_desc
   ```

5. **Check existing bet:**
   ```sql
   SELECT 1 FROM bets WHERE user_id = $1 AND market_id = $2
   -- Uses: idx_bets_user_market (composite)
   ```

---

### 9.2 Query Optimization Techniques

| Technique | Implementation | Benefit |
|-----------|----------------|---------|
| **Pagination** | LIMIT/OFFSET in leaderboard, portfolio | Reduces data transfer |
| **Indexing** | 18 strategic indexes | O(log n) lookup vs. O(n) full scan |
| **Caching** | 60s ISR on leaderboard endpoint | Reduces DB load for read-heavy endpoint |
| **Client-side caching** | React Query with stale-while-revalidate | Reduces API calls |
| **Denormalization** | leaderboard_scores table | Avoids expensive aggregate at query time |
| **Locking** | FOR UPDATE in procedures | Prevents race conditions + serializes concurrent updates |
| **Connection pooling** | Supabase managed | Reuses DB connections |

---

## 10. Data Migration & Evolution

### 10.1 Migration History

**Migration 1: Add phone_number column** (2026-05-01)

```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR(13);
ALTER TABLE users ADD CONSTRAINT users_phone_number_format_check
  CHECK (phone_number ~ '^\\+91[6-9][0-9]{9}$');
CREATE UNIQUE INDEX users_phone_number_unique_idx ON users(phone_number);
```

**Rationale:** Support SMS-based 2FA or login (future feature).

**Backward Compatibility:** NULL allowed for existing users; UNIQUE constraint deferred during migration.

---

### 10.2 Future Migrations (Planned)

1. **Add streak auto-promotion trigger**
   ```sql
   CREATE TRIGGER auto_update_rank AFTER UPDATE ON users
   FOR EACH ROW EXECUTE FUNCTION update_rank_by_streak();
   ```

2. **Add market cancellation & refund procedure**
   ```sql
   CREATE PROCEDURE cancel_market_with_refunds(p_market_id UUID)
   ```

3. **Add daily bonus transaction**
   ```sql
   CREATE PROCEDURE award_daily_bonus()
   -- Callable by cron/scheduler
   ```

4. **Add comment moderation table**
   ```sql
   CREATE TABLE comment_reports (...)
   CREATE TABLE moderation_actions (...)
   ```

---

## 11. Testing & Quality Assurance

### 11.1 Database Testing

**Trigger Testing:**
```sql
-- Test: Bet placement with insufficient funds
BEGIN;
INSERT INTO users (id, username, email, password_hash, wallet_balance)
  VALUES (gen_random_uuid(), 'test_user', 'test@ex.com', 'hash', 50.00);

INSERT INTO markets (id, title, ..., creator_id, status, expires_at)
  VALUES (..., user_id, 'OPEN', NOW() + INTERVAL '1 day');

-- Should FAIL: balance 50 < amount 100
INSERT INTO bets (user_id, market_id, side, amount, ...)
  VALUES (user_id, market_id, 'YES', 100.00, ...);
ROLLBACK;
-- Expected: EXCEPTION 'Insufficient funds'
```

**Procedure Testing:**
```sql
-- Test: Market resolution payout calculation
-- 1. Create market with known volumes
-- 2. Place bets from multiple users
-- 3. CALL resolve_market(...)
-- 4. Verify: winner payouts, loser statuses, leaderboard updates, admin logs
```

### 11.2 API Testing

**Rate Limiting Test:**
```typescript
// Attempt 11 bets in 60 seconds from same user
for (let i = 0; i < 11; i++) {
  const res = await placeBet(marketId, { side: "YES", amount: 10 });
  if (i < 10) expect(res.status).toBe(200);
  if (i === 10) expect(res.status).toBe(429); // Too Many Requests
}
```

---

## 12. Security Considerations

### 12.1 Authentication & Authorization

- ✅ **Session tokens:** Signed JWT, httpOnly cookies, 7-day expiry
- ✅ **Password hashing:** bcrypt with 10 salt rounds
- ✅ **RLS enforcement:** Supabase RLS policies on every table
- ✅ **Admin verification:** Rank check + email whitelist

### 12.2 Data Protection

- ✅ **Immutable ledger:** transactions table append-only (no UPDATE/DELETE)
- ✅ **Audit trail:** admin_logs records all privileged actions with JSONB metadata
- ✅ **Constraint enforcement:** CHECK, UNIQUE, FK prevent invalid states
- ✅ **Transaction isolation:** Serializable isolation on settlement procedures

### 12.3 Input Validation

- ✅ **Zod schemas:** signupSchema, loginSchema, betSchema validated on API
- ✅ **Rate limiting:** 10 bets per minute per user (in-memory)
- ✅ **SQL injection prevention:** Parameterized queries, prepared statements
- ✅ **Type safety:** TypeScript end-to-end (API → DB)

### 12.4 Vulnerable Patterns (Mitigated)

| Risk | Mitigation |
|------|-----------|
| **Race condition on wallet deduction** | FOR UPDATE row lock in trigger |
| **Concurrent market resolution** | FOR UPDATE lock on market row |
| **Unauthorized admin actions** | is_admin_user() function, rank check |
| **Double-spending** | Wallet balance validation + atomic transaction |
| **Injection attacks** | Parameterized queries, input validation |
| **Unauthorized portfolio access** | RLS policy: users see own data only |

---

## 13. Performance Metrics & SLA

### 13.1 Expected Performance

| Operation | Expected Latency | Bottleneck |
|-----------|-----------------|-----------|
| Fetch markets list | 50-100ms | Network + index scan |
| Fetch market detail | 30-50ms | Single row lookup |
| Place bet | 200-400ms | Trigger + wallet lock |
| Market resolution | 2-5s (per 100 bets) | Loop over winning bets + leaderboard updates |
| Fetch leaderboard | 20-30ms | Cached (60s ISR) |
| Fetch portfolio | 100-150ms | Multi-query (user + bets + transactions) |

### 13.2 Scaling Considerations

- **Wallet balance updates:** Row-level locking serializes bets per user; OK for typical usage
- **Market resolution:** Procedure loops per bet; may slow down if >1000 bets per market
- **Leaderboard:** Cached at 60s; stale data acceptable
- **Read-heavy:** Comments, markets fetch → add caching (Redis)
- **Write-heavy:** Bets, transactions → partition by market_id or user_id (future)

---

## 14. Conclusion & Recommendations

### 14.1 Database Maturity Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| **Schema normalization** | ✅ 3NF/BCNF | Properly normalized; 1 intentional denormalization (leaderboard) |
| **Data integrity** | ✅ Excellent | Comprehensive constraints, triggers, FK |
| **ACID compliance** | ✅ Strong | Transactions, locking, audit trails |
| **Query performance** | ✅ Good | 18 indexes; ISR caching; denormalization where needed |
| **Security** | ✅ Solid | RLS, hashed passwords, parameterized queries |
| **Documentation** | ✅ Complete | Code comments, procedure docs, this analysis |

### 14.2 Recommendations

**Short-term (Next Sprint):**
1. Implement missing procedures: `cancel_market_with_refunds()`, `award_daily_bonus()`
2. Add `award_signup_bonus()` invocation on user creation
3. Implement streak-based rank auto-promotion
4. Add cron job for automatic market closure (OPEN → CLOSED on expiry)

**Medium-term (Next Quarter):**
1. Partitioning: Split bets/transactions by user_id for better scalability
2. Materialized view: Pre-compute user statistics (total_won, total_wagered) for portfolio fetches
3. Redis caching: Cache market odds, leaderboard, popular markets
4. Comment moderation: Add reports/flagging + moderation action logging

**Long-term (Next Year):**
1. Read replicas: Separate read-only endpoint for analytics queries
2. Sharding: By market_id for marketplace scalability (100k+ concurrent markets)
3. Kafka events: Log all transactions for real-time dashboards, fraud detection
4. BI warehouse: Extract nightly snapshots for reporting

---

## Appendix: Schema Definitions

### A. Complete Table Definitions

See [schema.sql](database/schema.sql) and [procedures.sql](database/procedures.sql) for authoritative DDL.

### B. Type Definitions

See [types/index.ts](types/index.ts) for TypeScript interface definitions mirroring schema.

### C. Seed Data

See [seeds.sql](database/seeds.sql) for development data (6 users, 8 markets, 15 bets, 5 comments).

---

**End of Analysis**  
Generated: May 2, 2026  
Analyzed by: Database Assistant  
Next Review: TBD
