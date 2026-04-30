# PredictMarket — Master Engineering Prompt
> **Execute this file top-to-bottom with an AI coding agent (Claude, Cursor, Copilot Workspace).**
> Each section is a self-contained prompt block. Complete phases in order. Never skip a phase.

---

## ⚙️ Global Context (Inject into every session)

```
You are building PredictMarket — a full-stack, production-grade virtual-coin prediction
market platform. It is college-safe, uses no real money or cryptocurrency.

Aesthetic target: Polymarket UX quality + Robinhood dashboard polish + Gen-Z viral mechanics.

Stack (locked — do not deviate):
  Frontend : Next.js 15 (App Router) · TypeScript 5 · Tailwind CSS v4 · ShadCN UI
             Framer Motion · Recharts · Zustand · TanStack Query v5
  Backend  : Next.js API Routes (no separate Express server)
  Database : Supabase (PostgreSQL 15) — use supabase-js v2 client
  Realtime : Supabase Realtime channels (no custom WS server needed)
  Auth     : Supabase Auth (email/password + JWT)
  Deploy   : Vercel (frontend + API routes)

Coding Rules (non-negotiable):
  1. TypeScript strict mode — no `any`, no implicit returns
  2. Define all interfaces/types BEFORE components or functions that use them
  3. No TODOs, no placeholder comments, no mock data unless labeled // SEED
  4. All DB operations inside try/catch with typed error handling
  5. All environment variables via process.env — never hardcode secrets
  6. Every React component: named export + default export
  7. Group imports: React → Next.js → Third-party → Internal (@/...)
  8. Use Server Components by default; add 'use client' only when state/effects needed
  9. Optimistic UI on all mutations via TanStack Query
  10. Mobile-first responsive — every layout works at 375px
```

---

## 📁 Monorepo Folder Structure

```
predictmarket/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── markets/
│   │   ├── page.tsx                  # Browse all markets
│   │   └── [id]/
│   │       └── page.tsx              # Market detail + bet panel
│   ├── portfolio/
│   │   └── page.tsx
│   ├── leaderboard/
│   │   └── page.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── signup/route.ts
│   │   ├── markets/
│   │   │   ├── route.ts              # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET single
│   │   │       └── bet/route.ts      # POST place bet
│   │   ├── portfolio/route.ts
│   │   ├── leaderboard/route.ts
│   │   └── admin/
│   │       └── resolve/route.ts
│   ├── layout.tsx
│   ├── page.tsx                      # Homepage
│   └── globals.css
├── components/
│   ├── ui/                           # ShadCN primitives (auto-generated)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── market/
│   │   ├── MarketCard.tsx
│   │   ├── MarketGrid.tsx
│   │   ├── BetPanel.tsx
│   │   ├── ProbabilityBar.tsx
│   │   ├── OddsChart.tsx
│   │   └── CommentSection.tsx
│   ├── portfolio/
│   │   ├── PositionCard.tsx
│   │   └── ROIChart.tsx
│   ├── leaderboard/
│   │   └── LeaderboardTable.tsx
│   └── wallet/
│       └── WalletBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   └── server.ts                 # Server client (cookies)
│   ├── api/
│   │   └── fetchers.ts               # TanStack Query fetch functions
│   └── utils.ts                      # cn(), formatCoin(), formatDate()
├── hooks/
│   ├── useMarkets.ts
│   ├── useBet.ts
│   ├── usePortfolio.ts
│   └── useRealtimeOdds.ts
├── stores/
│   └── walletStore.ts                # Zustand wallet state
├── types/
│   └── index.ts                      # All shared TypeScript interfaces
├── database/
│   ├── schema.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   └── seeds.sql
├── middleware.ts                     # Auth guard
├── .env.local.example
└── package.json
```

---

## Phase 1 — TypeScript Types

**File:** `types/index.ts`

```
Generate the complete TypeScript type definitions file for PredictMarket.

Define the following interfaces (strict, no optional fields unless truly nullable):

export interface User {
  id: string                  // UUID
  username: string
  email: string
  wallet_balance: number      // virtual coins, min 0
  streak_count: number
  rank: UserRank
  created_at: string          // ISO8601
}

export type UserRank = 'Novice' | 'Analyst' | 'Expert' | 'Oracle' | 'Legend'

export interface Market {
  id: string
  title: string
  description: string
  category: Category
  creator_id: string
  yes_volume: number
  no_volume: number
  yes_probability: number     // 0–1 float, derived
  expires_at: string
  status: MarketStatus
  created_at: string
}

export type MarketStatus = 'OPEN' | 'CLOSED' | 'RESOLVED' | 'CANCELLED'

export interface Category {
  id: string
  name: string
  slug: string
  icon: string                // emoji or icon name
}

export interface Bet {
  id: string
  user_id: string
  market_id: string
  side: BetSide
  amount: number              // coins wagered
  shares: number              // calculated shares
  potential_payout: number
  status: BetStatus
  created_at: string
}

export type BetSide = 'YES' | 'NO'
export type BetStatus = 'OPEN' | 'WON' | 'LOST' | 'REFUNDED'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  reference_id: string | null  // bet_id or market_id
  description: string
  created_at: string
}

export type TransactionType = 'BET_PLACED' | 'BET_WON' | 'BET_REFUND' | 'SIGNUP_BONUS' | 'DAILY_BONUS'

export interface Comment {
  id: string
  user_id: string
  market_id: string
  content: string
  author: Pick<User, 'id' | 'username' | 'rank'>
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  user: Pick<User, 'id' | 'username' | 'rank' | 'streak_count'>
  score: number
  wins: number
  losses: number
  win_rate: number            // 0–1
  total_wagered: number
}

export interface Portfolio {
  user: User
  open_bets: Bet[]
  closed_bets: Bet[]
  total_wagered: number
  total_won: number
  total_lost: number
  roi: number                 // percentage, can be negative
  transactions: Transaction[]
}

// API Response wrappers
export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  code: string
  status: number
}

// Zustand store shape
export interface WalletStore {
  balance: number
  setBalance: (balance: number) => void
  deduct: (amount: number) => void
  add: (amount: number) => void
}

// Form types
export interface BetFormValues {
  side: BetSide
  amount: number
}

export interface CreateMarketFormValues {
  title: string
  description: string
  category_id: string
  expires_at: string
}

Output: Complete file with all types above. Add JSDoc comments on non-obvious fields.
No imports needed (pure type file). Export everything.
```

---

## Phase 2 — Database Schema

**File:** `database/schema.sql`

```
Generate a complete PostgreSQL 15 schema for Supabase with the following requirements.

Enable UUID extension at top: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

Tables:

1. users
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - username VARCHAR(30) UNIQUE NOT NULL CHECK (length(username) >= 3)
   - email VARCHAR(255) UNIQUE NOT NULL
   - password_hash TEXT NOT NULL
   - wallet_balance NUMERIC(12,2) DEFAULT 1000.00 CHECK (wallet_balance >= 0)
   - streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0)
   - rank VARCHAR(20) DEFAULT 'Novice' CHECK (rank IN ('Novice','Analyst','Expert','Oracle','Legend'))
   - last_active_at TIMESTAMPTZ DEFAULT NOW()
   - created_at TIMESTAMPTZ DEFAULT NOW()

2. categories
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - name VARCHAR(50) UNIQUE NOT NULL
   - slug VARCHAR(50) UNIQUE NOT NULL
   - icon VARCHAR(10) NOT NULL

3. markets
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - title VARCHAR(200) NOT NULL CHECK (length(title) >= 10)
   - description TEXT NOT NULL
   - category_id UUID NOT NULL REFERENCES categories(id)
   - creator_id UUID NOT NULL REFERENCES users(id)
   - yes_volume NUMERIC(14,2) DEFAULT 0 CHECK (yes_volume >= 0)
   - no_volume NUMERIC(14,2) DEFAULT 0 CHECK (no_volume >= 0)
   - resolution_side VARCHAR(3) CHECK (resolution_side IN ('YES','NO'))
   - status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','RESOLVED','CANCELLED'))
   - expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at)
   - created_at TIMESTAMPTZ DEFAULT NOW()

4. bets
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
   - market_id UUID NOT NULL REFERENCES markets(id)
   - side VARCHAR(3) NOT NULL CHECK (side IN ('YES','NO'))
   - amount NUMERIC(10,2) NOT NULL CHECK (amount > 0)
   - shares NUMERIC(12,4) NOT NULL CHECK (shares > 0)
   - potential_payout NUMERIC(12,2) NOT NULL
   - status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN','WON','LOST','REFUNDED'))
   - created_at TIMESTAMPTZ DEFAULT NOW()

5. transactions
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
   - type VARCHAR(30) NOT NULL CHECK (type IN ('BET_PLACED','BET_WON','BET_REFUND','SIGNUP_BONUS','DAILY_BONUS'))
   - amount NUMERIC(10,2) NOT NULL
   - reference_id UUID
   - description TEXT NOT NULL
   - created_at TIMESTAMPTZ DEFAULT NOW()

6. comments
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
   - market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE
   - content VARCHAR(500) NOT NULL CHECK (length(content) >= 1)
   - created_at TIMESTAMPTZ DEFAULT NOW()

7. leaderboard_scores
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
   - score NUMERIC(12,2) DEFAULT 0
   - wins INTEGER DEFAULT 0
   - losses INTEGER DEFAULT 0
   - total_wagered NUMERIC(14,2) DEFAULT 0
   - updated_at TIMESTAMPTZ DEFAULT NOW()

8. admin_logs
   - id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
   - admin_id UUID NOT NULL REFERENCES users(id)
   - action VARCHAR(100) NOT NULL
   - target_id UUID
   - metadata JSONB
   - created_at TIMESTAMPTZ DEFAULT NOW()

Indexes (add after tables):
   - markets: status, category_id, expires_at, creator_id
   - bets: user_id, market_id, status, (user_id, market_id) composite
   - transactions: user_id, type, created_at
   - comments: market_id, user_id
   - leaderboard_scores: score DESC

Row Level Security (RLS) — enable on all tables:
   - users: SELECT own row only, UPDATE own row only
   - markets: SELECT all OPEN/RESOLVED, INSERT authenticated, UPDATE own + admin
   - bets: SELECT/INSERT own rows only
   - transactions: SELECT own rows only
   - comments: SELECT all, INSERT authenticated, DELETE own
   - leaderboard_scores: SELECT all, UPDATE via service role only
   - admin_logs: SELECT/INSERT admin role only

Output: Full SQL file, comments on each table block, constraints verified.
```

---

## Phase 3 — PL/pgSQL Procedures, Triggers & Functions

**File:** `database/procedures.sql`

```
Generate complete PL/pgSQL for Supabase PostgreSQL. All objects must be production-safe.

---

FUNCTION 1: calculate_probability
  Signature: calculate_probability(yes_vol NUMERIC, no_vol NUMERIC) RETURNS NUMERIC
  Logic:
    - If both volumes are 0, return 0.5
    - Use simple ratio: yes_vol / (yes_vol + no_vol)
    - Clamp result between 0.01 and 0.99 (never absolute certainty)
    - RETURNS NUMERIC(5,4)
  Use: IMMUTABLE, STRICT

FUNCTION 2: calculate_shares
  Signature: calculate_shares(amount NUMERIC, probability NUMERIC, side TEXT) RETURNS NUMERIC
  Logic:
    - YES side: shares = amount / probability
    - NO side:  shares = amount / (1 - probability)
    - Minimum shares = 0.0001
  Use: IMMUTABLE, STRICT

---

TRIGGER FUNCTION: trg_deduct_wallet_on_bet
  Fires: BEFORE INSERT ON bets (FOR EACH ROW)
  Logic:
    1. SELECT wallet_balance FROM users WHERE id = NEW.user_id FOR UPDATE
    2. IF balance < NEW.amount THEN
         RAISE EXCEPTION 'Insufficient funds: balance=%, required=%', balance, NEW.amount
         USING ERRCODE = 'P0001'
    3. UPDATE users SET wallet_balance = wallet_balance - NEW.amount WHERE id = NEW.user_id
    4. INSERT INTO transactions (user_id, type, amount, reference_id, description)
       VALUES (NEW.user_id, 'BET_PLACED', -NEW.amount, NEW.id, 
               'Bet placed on market ' || NEW.market_id)
    5. RETURN NEW

Create trigger: BEFORE INSERT ON bets EXECUTE FUNCTION trg_deduct_wallet_on_bet()

---

PROCEDURE: resolve_market
  Signature: resolve_market(p_market_id UUID, p_winning_side TEXT, p_admin_id UUID)
  Full transaction with SAVEPOINT and ROLLBACK:

  BEGIN
    SAVEPOINT sp_resolve;
    
    -- 1. Validate
    IF p_winning_side NOT IN ('YES','NO') THEN
      RAISE EXCEPTION 'Invalid winning side: %', p_winning_side
    
    -- 2. Lock market row
    SELECT status INTO v_status FROM markets WHERE id = p_market_id FOR UPDATE
    IF v_status != 'OPEN' AND v_status != 'CLOSED' THEN
      RAISE EXCEPTION 'Market % cannot be resolved (status: %)', p_market_id, v_status
    
    -- 3. Calculate total winning pool
    SELECT SUM(amount) INTO v_winning_pool FROM bets
    WHERE market_id = p_market_id AND side = p_winning_side AND status = 'OPEN'
    
    -- 4. Calculate total loser pool (house pot)
    SELECT SUM(amount) INTO v_loser_pool FROM bets
    WHERE market_id = p_market_id AND side != p_winning_side AND status = 'OPEN'
    
    -- 5. Distribute winnings with CURSOR
    -- Cursor iterates all winning bets, calculates proportional payout:
    --   payout = bet.amount + (bet.amount / winning_pool * loser_pool * 0.95)
    --   (5% platform fee retained)
    FOR v_bet IN (SELECT * FROM bets WHERE market_id = p_market_id 
                  AND side = p_winning_side AND status = 'OPEN') LOOP
      v_payout := v_bet.amount + (v_bet.amount / NULLIF(v_winning_pool,0) * v_loser_pool * 0.95)
      
      UPDATE users SET wallet_balance = wallet_balance + v_payout
        WHERE id = v_bet.user_id
      
      UPDATE bets SET status = 'WON', potential_payout = v_payout
        WHERE id = v_bet.id
      
      INSERT INTO transactions (user_id, type, amount, reference_id, description)
        VALUES (v_bet.user_id, 'BET_WON', v_payout, v_bet.id, 
                'Won bet on market ' || p_market_id)
      
      -- Update leaderboard
      INSERT INTO leaderboard_scores (user_id, wins, total_wagered, score)
        VALUES (v_bet.user_id, 1, v_bet.amount, v_payout - v_bet.amount)
        ON CONFLICT (user_id) DO UPDATE SET
          wins = leaderboard_scores.wins + 1,
          total_wagered = leaderboard_scores.total_wagered + v_bet.amount,
          score = leaderboard_scores.score + (v_payout - v_bet.amount),
          updated_at = NOW()
    END LOOP
    
    -- 6. Mark losing bets
    UPDATE bets SET status = 'LOST'
    WHERE market_id = p_market_id AND side != p_winning_side AND status = 'OPEN'
    
    -- Update loser leaderboard stats
    UPDATE leaderboard_scores ls SET
      losses = ls.losses + subq.loss_count,
      total_wagered = ls.total_wagered + subq.total_amount,
      updated_at = NOW()
    FROM (
      SELECT user_id, COUNT(*) as loss_count, SUM(amount) as total_amount
      FROM bets WHERE market_id = p_market_id AND status = 'LOST'
      GROUP BY user_id
    ) subq WHERE ls.user_id = subq.user_id
    
    -- 7. Resolve market
    UPDATE markets SET 
      status = 'RESOLVED', 
      resolution_side = p_winning_side
    WHERE id = p_market_id
    
    -- 8. Admin log
    INSERT INTO admin_logs (admin_id, action, target_id, metadata)
      VALUES (p_admin_id, 'RESOLVE_MARKET', p_market_id,
              jsonb_build_object('winning_side', p_winning_side,
                                  'winning_pool', v_winning_pool,
                                  'loser_pool', v_loser_pool))
  EXCEPTION WHEN OTHERS THEN
    ROLLBACK TO SAVEPOINT sp_resolve
    RAISE
  END

---

FUNCTION: get_leaderboard_report
  Uses explicit CURSOR to generate ranked leaderboard:
  - Opens cursor over leaderboard_scores JOIN users ordered by score DESC
  - Returns TABLE(rank INT, username TEXT, score NUMERIC, wins INT, losses INT, win_rate NUMERIC, streak INT)
  - Assigns rank using ROW_NUMBER() OVER (ORDER BY score DESC)
  - Limit: top 100 users

---

FUNCTION: award_signup_bonus
  Called after user creation. Grants 1000 coins and logs transaction.
  Signature: award_signup_bonus(p_user_id UUID)

Output: Complete SQL file. Include DO $$ blocks for testing procedures.
Wrap all procedures in transaction blocks. Add RAISE NOTICE for debug logging.
```

---

## Phase 4 — Database Seeds

**File:** `database/seeds.sql`

```
Generate seed data for development and demo purposes.

Include:
1. 6 categories:
   - Politics, Technology, Sports, Finance, Entertainment, Science
   - Each with appropriate emoji icon and URL slug

2. 1 admin user (password_hash is bcrypt of 'admin123'):
   username: 'admin', email: 'admin@predictmarket.com'
   wallet_balance: 999999, rank: 'Legend'

3. 5 regular demo users:
   usernames: alice_oracle, bob_trader, carol_wins, dave_bets, eve_predicts
   wallet_balance: 1000–5000 range (vary them)
   ranks: spread across Novice to Expert

4. 8 demo markets (mix of OPEN and RESOLVED):
   - 2 Technology markets (AI topics)
   - 2 Politics markets
   - 2 Sports markets
   - 1 Finance market
   - 1 Science market
   Mix of expires_at: some expiring soon (3 days), some in 30 days
   1 market already RESOLVED as YES, 1 RESOLVED as NO

5. 15 demo bets spread across users and markets

6. Leaderboard scores derived from bets above

7. 5 comments across different markets

Use explicit UUIDs (hardcoded, not uuid_generate_v4()) for demo data so it's reproducible.
Use DO $$ blocks for any conditional logic.
```

---

## Phase 5 — Supabase Client & Utility Library

**File:** `lib/supabase/client.ts`

```
Generate the browser-side Supabase client for Next.js 15 App Router.

Requirements:
- Use @supabase/ssr package (not @supabase/auth-helpers-nextjs — that's deprecated)
- createBrowserClient from @supabase/ssr
- Singleton pattern — don't create multiple instances
- Export typed client using Database type generated from schema
- Include JSDoc on exported functions

Types needed (inline in this file until supabase gen types runs):
- Reference the types from @/types for User, Market, Bet, etc.
```

**File:** `lib/supabase/server.ts`

```
Generate the server-side Supabase client for Next.js 15 App Router.

Requirements:
- Use createServerClient from @supabase/ssr
- Reads/writes cookies via Next.js cookies() from next/headers
- Export async function createClient() that returns typed Supabase client
- Mark as server-only (import 'server-only')
- Used in Server Components and API Route Handlers
```

**File:** `lib/utils.ts`

```
Generate utility functions:

1. cn(...inputs: ClassValue[]): string
   - clsx + tailwind-merge for conditional className merging

2. formatCoins(amount: number): string
   - Formats virtual coin amounts: 1000 → "1,000 coins", 1500000 → "1.5M coins"

3. formatProbability(prob: number): string
   - 0.73 → "73%"

4. formatTimeLeft(expiresAt: string): string
   - Returns human-readable countdown: "3d 4h", "2h 30m", "Expired"

5. calculateProbability(yesVol: number, noVol: number): number
   - Mirror of SQL function: returns 0.5 if both 0, else clamp(yes/(yes+no), 0.01, 0.99)

6. calculatePotentialPayout(amount: number, probability: number, side: BetSide): number
   - YES: amount / probability
   - NO: amount / (1 - probability)

7. getRankColor(rank: UserRank): string
   - Returns Tailwind color class for each rank tier

8. getMarketStatusColor(status: MarketStatus): string
   - Returns semantic color class

Import types from @/types. Export all functions individually and as default object.
```

---

## Phase 6 — Zustand Store & React Query Hooks

**File:** `stores/walletStore.ts`

```
Generate a Zustand store for wallet state management.

Interface (from types/index.ts): WalletStore

Implementation:
- Use zustand with immer middleware for immutable updates
- Persist balance to localStorage with zustand/middleware persist
- Actions: setBalance, deduct(amount), add(amount)
- Derived: isInsufficient(amount: number): boolean
- Hydration guard for SSR (avoid hydration mismatch)

Add useWallet() convenience hook that returns the full store.
```

**File:** `hooks/useMarkets.ts`

```
Generate TanStack Query v5 hooks for market data.

Hooks:
1. useMarkets(filters?: { category?: string; status?: MarketStatus })
   - GET /api/markets with query params
   - staleTime: 30 seconds
   - Returns { markets: Market[], isLoading, error }

2. useMarket(id: string)
   - GET /api/markets/:id
   - staleTime: 15 seconds
   - Enabled only when id is truthy

3. useCreateMarket()
   - POST /api/markets
   - On success: invalidate useMarkets query, show toast
   - Returns useMutation result

All fetch functions in lib/api/fetchers.ts (generate that file too).
Use proper TypeScript generics on useQuery<Market[], Error>.
Handle 401 errors by redirecting to /login.
```

**File:** `hooks/useBet.ts`

```
Generate TanStack Query mutation hook for placing bets.

Hook: useBet(marketId: string)
  - POST /api/markets/:id/bet
  - Optimistic update: immediately update yes_probability on market detail
  - On error: rollback optimistic update
  - On success: 
      invalidate ['market', marketId]
      invalidate ['portfolio']
      deduct from Zustand walletStore
      show success toast with potential payout
  - Returns { placeBet, isPending, error }
  - Input: BetFormValues { side: BetSide, amount: number }
```

**File:** `hooks/useRealtimeOdds.ts`

```
Generate a Supabase Realtime hook for live odds updates.

Hook: useRealtimeOdds(marketId: string)
  - Subscribes to Supabase Realtime channel: `market:${marketId}`
  - Listens for postgres_changes on markets table WHERE id = marketId
  - On UPDATE: update TanStack Query cache for ['market', marketId]
  - Cleanup: unsubscribe on unmount
  - Returns: { yesProb: number, noProb: number, isConnected: boolean }
  - Uses 'use client' directive
```

---

## Phase 7 — API Route Handlers

**File:** `app/api/markets/route.ts`

```
Generate Next.js 15 App Router Route Handler for /api/markets.

GET handler:
  - Query params: category (string), status (MarketStatus), limit (number, default 20), offset (number, default 0)
  - Joins markets with categories and users (creator username only)
  - Calculates yes_probability using calculate_probability() SQL function
  - Returns ApiSuccess<Market[]> with pagination metadata
  - Caches with Next.js fetch cache: revalidate every 30s

POST handler:
  - Protected: verify Supabase session via createClient()
  - Body: CreateMarketFormValues — validate with Zod schema
  - Insert into markets, set creator_id from session
  - Return ApiSuccess<Market> with 201 status

Zod schema for CreateMarketFormValues (inline):
  - title: z.string().min(10).max(200)
  - description: z.string().min(20).max(2000)
  - category_id: z.string().uuid()
  - expires_at: z.string().datetime() — must be in the future
```

**File:** `app/api/markets/[id]/bet/route.ts`

```
Generate Next.js 15 Route Handler for POST /api/markets/:id/bet.

POST handler (protected):
  1. Verify session — 401 if missing
  2. Validate body with Zod: { side: z.enum(['YES','NO']), amount: z.number().min(1).max(100000) }
  3. Fetch market — 404 if not found, 400 if status != 'OPEN', 400 if expired
  4. Fetch user wallet — 400 if insufficient funds (double check beyond trigger)
  5. Calculate shares and potential_payout using utility functions
  6. Insert bet — Postgres trigger handles wallet deduction atomically
  7. Update market yes_volume or no_volume
  8. Return ApiSuccess<Bet> with 201

Error handling:
  - Catch Postgres error code 'P0001' (insufficient funds trigger) → 400
  - Catch unique constraint violations → 409
  - All other DB errors → 500 with generic message (never expose DB internals)

Rate limiting: max 10 bets per user per minute (use in-memory Map with timestamp — TODO: replace with Redis in production, label this comment clearly)
```

**File:** `app/api/leaderboard/route.ts`

```
Generate Route Handler for GET /api/leaderboard.

GET handler (public):
  - Query param: limit (default 50, max 100)
  - Call get_leaderboard_report() PostgreSQL function via supabase.rpc()
  - Calculate win_rate = wins / (wins + losses) with 0 fallback
  - Return ApiSuccess<LeaderboardEntry[]>
  - Cache: revalidate 60 seconds
```

**File:** `app/api/admin/resolve/route.ts`

```
Generate Route Handler for POST /api/admin/resolve.

POST handler (admin only):
  1. Verify session
  2. Check user rank = 'Legend' or hardcoded admin check — 403 if not admin
  3. Validate body: { market_id: UUID, winning_side: 'YES'|'NO' }
  4. Call resolve_market() stored procedure via supabase.rpc()
  5. Return ApiSuccess<{ resolved: true, market_id: string }>
  6. On error: parse Postgres RAISE EXCEPTION message and return 400
```

---

## Phase 8 — Next.js Middleware (Auth Guard)

**File:** `middleware.ts`

```
Generate Next.js 15 middleware for authentication and route protection.

Protected routes (redirect to /login if no session):
  - /portfolio
  - /admin (additionally check admin rank)
  - /markets (allow browsing, but betting requires auth — handle in component)

Public routes (redirect to /markets if already authenticated):
  - /login
  - /signup

Implementation:
  - Use @supabase/ssr createServerClient in middleware
  - Refresh session token if expired (call supabase.auth.getUser())
  - Update response cookies with refreshed token
  - Use NextResponse.redirect() for unauthorized access
  - Export config matcher to exclude _next, static files, api/auth routes

Follow exact Supabase SSR middleware pattern from their docs.
```

---

## Phase 9 — UI Components

**File:** `components/market/MarketCard.tsx`

```
Generate a premium MarketCard component matching Polymarket aesthetics.

Props: { market: Market; onClick?: () => void }

Visual requirements:
  - Dark card with glassmorphism: bg-zinc-900/80 backdrop-blur border border-zinc-800
  - Category badge (top-left) with category icon + name
  - Market title (2-line clamp, text-white font-semibold text-base)
  - Animated probability bar:
      YES bar (green, width = yes_probability * 100%)
      NO bar (red, width = no_probability * 100%)
      Framer Motion: animate width change over 0.5s ease-out
      Show percentages on each side
  - Stats row: volume (coins icon), liquidity, time left countdown
  - Hover: scale(1.02) with subtle border glow (box-shadow: 0 0 20px rgba(59,130,246,0.15))
  - 'use client' directive required

Animations (Framer Motion):
  - Card entry: fade-in + slide-up (y: 20 → 0, opacity: 0 → 1)
  - Probability bar: layout animation on width change
  - Hover: whileHover={{ scale: 1.02 }}

Accessibility: aria-label on card, role="button" if onClick provided.
```

**File:** `components/market/BetPanel.tsx`

```
Generate the BetPanel component for market detail page.

Props: { market: Market }

UI layout:
  - Sticky right panel (lg:sticky lg:top-4)
  - Two tabs: "Buy YES" (green) / "Buy NO" (red)
  - Amount input with preset buttons: [10, 50, 100, 500, MAX]
  - Real-time payout calculator:
      "Potential Payout: X coins (+Y%)"
      Updates as user types — use useMemo for calculation
  - Wallet balance display (from Zustand walletStore)
  - Submit button: "Place Bet" — disabled if amount > balance or market not OPEN
  - Loading spinner during mutation (useBet hook)
  - Success state: green checkmark + confetti-like animation for 2 seconds

Error handling display:
  - Inline error message for insufficient funds
  - Toast notification for server errors (use sonner library)

Form validation (react-hook-form + Zod):
  - amount: must be positive integer, max = wallet_balance
  - Show inline validation errors

'use client' required. Import useBet, useWallet hooks.
```

**File:** `components/market/OddsChart.tsx`

```
Generate a Recharts line chart showing probability history.

Props: { marketId: string; currentProb: number }

Chart requirements:
  - Fetch historical probability snapshots (generate mock data for now from current prob — 
    create realistic-looking history with small random walk backwards 30 days)
  - Recharts ResponsiveContainer + LineChart
  - Single line: YES probability over time
  - Custom tooltip: "73.2% YES · Jan 15 2:30pm"
  - X-axis: dates, Y-axis: 0–100%
  - Line color: gradient from #ef4444 (low prob) to #22c55e (high prob) — use stroke based on currentProb
  - Dark theme: fill transparent, stroke zinc-700 on axes, white labels
  - Animated: isAnimationActive={true} animationDuration={800}
  - Reference line at 50% (dashed zinc-500)

'use client' required (Recharts is client-only).
```

---

## Phase 10 — Page Components

**File:** `app/page.tsx` (Homepage)

```
Generate the PredictMarket homepage — Server Component.

Sections (top to bottom):

1. HERO SECTION:
   - Headline: "Predict the Future. Win Coins."
   - Subtext: "Trade on real-world events with virtual coins. No risk, pure skill."
   - Two CTAs: "Start Predicting" (primary) → /signup, "Browse Markets" (ghost) → /markets
   - Background: dark gradient mesh (CSS), subtle animated particles or noise
   - Live stats strip: "12,450 active markets · 94,200 predictions today · $2.1M in virtual volume"
     (fetch real counts from Supabase, use Suspense with skeleton fallback)

2. CATEGORY TABS:
   - Horizontal scrollable tab bar with all categories
   - Each tab: icon + name
   - "All" tab first
   - Selected tab: underline accent with smooth transition

3. TRENDING MARKETS GRID:
   - Fetch top 6 markets by (yes_volume + no_volume) DESC where status = 'OPEN'
   - 3-column grid on desktop, 1-column on mobile
   - MarketCard component for each
   - "View All Markets →" link at bottom

4. HOW IT WORKS:
   - 3-step horizontal section: Browse → Predict → Win
   - Simple iconography, brief copy

Fetch data server-side using Supabase server client.
Use Suspense boundaries around data-dependent sections with skeleton loaders.
```

**File:** `app/markets/[id]/page.tsx`

```
Generate the Market Detail page — hybrid Server + Client Component.

Server Component wrapper:
  - Fetch market by id (notFound() if missing)
  - generateMetadata export with market title as page title
  - Pass market as prop to client components

Layout (2-column on desktop, stacked on mobile):

LEFT COLUMN (flex-1):
  1. Market header: title, category badge, status badge, creator info, expiry countdown
  2. OddsChart component (current probability visualization)
  3. Key stats: Total Volume, Yes Volume, No Volume, # Bettors
  4. Description (expandable if > 300 chars)
  5. CommentSection component

RIGHT COLUMN (w-80 lg:w-96):
  1. BetPanel component (sticky)
  2. Recent trades feed:
     - useRealtimeOdds hook for live updates
     - Last 10 bets (side, amount, time ago)
     - New bets animate in from top (Framer Motion AnimatePresence)

Market status banner:
  - RESOLVED: show winning side, your outcome (won/lost), payout received
  - CLOSED: "Market closed — awaiting resolution"
  - CANCELLED: "Market cancelled — all bets refunded"
```

**File:** `app/portfolio/page.tsx`

```
Generate Portfolio page — protected Server Component.

Fetch via /api/portfolio (create this route too):
  - User's open bets with market details
  - Closed/resolved bets with outcomes
  - Transaction history
  - ROI calculation

Sections:

1. STATS HEADER (4 cards):
   - Wallet Balance (current coins)
   - Total Wagered (all time)
   - Total Won
   - ROI % (colored green/red based on positive/negative)

2. ROI CHART:
   - ROIChart component (Recharts AreaChart)
   - Running total of wins - losses over time
   - Time range selector: 7d / 30d / All

3. OPEN POSITIONS:
   - Table: Market | Side | Amount | Current Odds | Potential Payout | Expires
   - Probability bar showing current market odds
   - "Sell" button (future feature — show as disabled with tooltip)

4. CLOSED POSITIONS:
   - Table: Market | Side | Amount | Outcome | Payout | Date
   - WON rows: green badge + payout amount
   - LOST rows: red badge

5. TRANSACTION HISTORY:
   - Chronological list with icons per type
   - Infinite scroll or pagination (25 per page)
```

**File:** `app/leaderboard/page.tsx`

```
Generate Leaderboard page — Server Component.

Fetch top 100 from /api/leaderboard.

Layout:

1. HEADER: "Top Predictors" with live updater note
2. PODIUM (top 3): large cards with rank medal, username, score, win rate
3. LEADERBOARD TABLE (rank 4–100):
   Columns: # | Player | Score | Wins | Losses | Win Rate | Streak | Rank Badge
   - Alternating row backgrounds (zinc-900/zinc-800)
   - Current user's row highlighted in blue if authenticated
   - Rank badges colored by tier (Novice=gray, Analyst=blue, Expert=purple, Oracle=amber, Legend=red)
   - Win rate shown as progress bar in cell
   - Top 3 get medal emoji in rank column
4. MY RANK card (if authenticated): shows user's current rank, score, how many points to next rank
```

**File:** `app/admin/page.tsx`

```
Generate Admin Dashboard — protected page (admin role only).

Check admin in Server Component — redirect if not admin rank.

Sections:

1. STATS OVERVIEW (metric cards):
   - Total markets (open/resolved/cancelled breakdown)
   - Total users registered
   - Total bets placed today
   - Platform coins in circulation

2. MARKET MANAGEMENT:
   - Table of all markets: title | status | volume | expires | action
   - Filter tabs: All / Open / Closed / Resolved
   - "Resolve Market" button per row → opens modal with YES/NO choice
   - "Feature Market" toggle (marks market as featured on homepage)
   - "Cancel Market" with confirmation dialog

3. CREATE MARKET FORM:
   - Uses react-hook-form + Zod
   - Fields: Title, Description, Category (select), Expiry Date (date picker)
   - Submit calls POST /api/markets
   - Inline validation

4. RECENT ADMIN LOGS:
   - Table: Action | Target | Admin | Timestamp
   - Auto-refresh every 30 seconds

5. USER MANAGEMENT (simple):
   - Search user by username
   - View balance, rank, bet history
   - "Adjust Balance" (admin only action)

All forms: 'use client'. Tables: Server Component with Suspense.
```

---

## Phase 11 — Layout & Navigation

**File:** `app/layout.tsx`

```
Generate root layout for Next.js 15 App Router.

Requirements:
  - HTML lang="en"
  - Dark mode by default: <html className="dark">
  - Custom fonts via next/font/google:
      Display font: Space Grotesk (headings)
      Body font: Inter (body text)
  - Providers wrapper (create components/Providers.tsx):
      QueryClientProvider (TanStack Query)
      Zustand hydration
      Toaster (sonner)
  - Navbar component (persistent, server-rendered)
  - Main content with min-h-screen bg-zinc-950 text-zinc-100
  - Metadata: title template "PredictMarket | %s", description, OG tags

CSS variables in globals.css for brand colors:
  --color-yes: #22c55e (green-500)
  --color-no: #ef4444 (red-500)
  --color-coin: #f59e0b (amber-500)
  --color-brand: #3b82f6 (blue-500)
```

**File:** `components/layout/Navbar.tsx`

```
Generate the top navigation bar.

Left: PredictMarket logo (coin icon + wordmark)
Center (desktop only): Markets | Leaderboard | Portfolio links with active state
Right:
  - WalletBadge component (shows balance, coin icon, animated on change)
  - User avatar dropdown (username, rank badge, Settings, Sign Out)
  - Login / Sign Up buttons if unauthenticated

Mobile: hamburger menu → slide-out drawer with all nav links

Styling: bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50
Active link: text-white with bottom border-b-2 border-blue-500
Hover: text-zinc-200 transition-colors

'use client' for mobile menu state. Server-render where possible.
```

---

## Phase 12 — Environment & Config Files

**File:** `.env.local.example`

```
Generate .env.local.example with all required variables:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Never expose client-side

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PredictMarket

# Auth
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

# Optional: Rate limiting (future)
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

Include a README block at top explaining where to find each value in Supabase dashboard.
```

**File:** `package.json`

```
Generate package.json with exact versions for all dependencies:

dependencies:
  next: ^15.0.0
  react: ^19.0.0
  react-dom: ^19.0.0
  typescript: ^5.0.0
  @supabase/supabase-js: ^2.45.0
  @supabase/ssr: ^0.5.0
  @tanstack/react-query: ^5.56.0
  zustand: ^5.0.0
  framer-motion: ^11.0.0
  recharts: ^2.12.0
  react-hook-form: ^7.53.0
  @hookform/resolvers: ^3.9.0
  zod: ^3.23.0
  clsx: ^2.1.0
  tailwind-merge: ^2.5.0
  sonner: ^1.5.0
  date-fns: ^4.1.0
  immer: ^10.1.0
  lucide-react: ^0.441.0

devDependencies:
  @types/node: ^20.0.0
  @types/react: ^19.0.0
  @types/react-dom: ^19.0.0
  eslint: ^8.0.0
  eslint-config-next: ^15.0.0
  prettier: ^3.0.0
  tailwindcss: ^4.0.0
  autoprefixer: ^10.0.0

scripts:
  dev, build, start, lint, type-check (tsc --noEmit), db:types (supabase gen types)

Include engines: { node: ">=20.0.0" }
```

**File:** `tsconfig.json`

```
Generate strict TypeScript config for Next.js 15:
  - strict: true
  - noUncheckedIndexedAccess: true
  - exactOptionalPropertyTypes: true
  - paths: { "@/*": ["./*"] }
  - lib: ["dom", "dom.iterable", "esnext"]
  - target: ES2022
  - moduleResolution: bundler
  - All Next.js recommended settings
```

---

## Phase 13 — Final Checklist

Before submission / demo, verify each item:

```markdown
### Database
- [ ] All tables created with constraints and indexes
- [ ] RLS policies enabled and tested
- [ ] Triggers fire correctly (test insufficient funds case)
- [ ] resolve_market() distributes correct payouts
- [ ] Seed data loads without errors

### Auth
- [ ] Signup creates user + awards signup bonus (1000 coins)
- [ ] Login returns valid session
- [ ] Middleware redirects unauthenticated users from protected routes
- [ ] Session refreshes automatically

### Markets
- [ ] Browse markets with category filter works
- [ ] Market detail page loads with correct probability
- [ ] Realtime odds update when another user bets (open two browser tabs)

### Betting
- [ ] Bet placement deducts wallet atomically
- [ ] Insufficient funds returns clear error (not 500)
- [ ] Optimistic UI updates probability bar immediately
- [ ] Payout distributes correctly after resolve_market()

### Portfolio
- [ ] Open bets show current odds
- [ ] Closed bets show WON/LOST with payout
- [ ] ROI calculation is correct

### Leaderboard
- [ ] Scores update after market resolution
- [ ] Top 3 podium renders correctly
- [ ] Current user row is highlighted

### Admin
- [ ] Resolve market calls stored procedure (not application logic)
- [ ] Admin log records every resolve action
- [ ] Non-admin cannot access /admin (middleware guard)

### UI/UX
- [ ] All pages responsive at 375px
- [ ] Probability bars animate smoothly
- [ ] Loading skeletons on all async sections
- [ ] Error states handled (not blank screens)
- [ ] Dark mode consistent across all pages
```

---

## Quick Reference — API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | — | Register + get session |
| POST | `/api/auth/login` | — | Login + get session |
| GET | `/api/markets` | — | List markets (filterable) |
| POST | `/api/markets` | ✓ | Create market |
| GET | `/api/markets/:id` | — | Market detail |
| POST | `/api/markets/:id/bet` | ✓ | Place bet |
| GET | `/api/portfolio` | ✓ | User portfolio |
| GET | `/api/leaderboard` | — | Top predictors |
| POST | `/api/admin/resolve` | Admin | Resolve market |

---

## Quick Reference — Key Database Objects

| Type | Name | Trigger/Call |
|------|------|------|
| TRIGGER | `trg_deduct_wallet_on_bet` | BEFORE INSERT ON bets |
| PROCEDURE | `resolve_market(market_id, winning_side, admin_id)` | supabase.rpc() |
| FUNCTION | `calculate_probability(yes_vol, no_vol)` | SQL inline / rpc() |
| FUNCTION | `calculate_shares(amount, probability, side)` | SQL inline |
| FUNCTION | `get_leaderboard_report(limit)` | supabase.rpc() |
| FUNCTION | `award_signup_bonus(user_id)` | Called post-signup |

---

*PredictMarket Master Prompt v2.0 — Built for maximum AI coding agent productivity*
*Execute phases in order. Each phase depends on all previous phases being complete.*