# PredictMarket

PredictMarket is a college-safe, virtual-coin prediction market built with Next.js, Supabase, and Tailwind CSS. Users can browse markets, place YES/NO bets, follow live odds, view portfolios, and compete on a leaderboard without using real money or crypto.

## Tech Stack

- Next.js 16 App Router
- TypeScript 5
- Tailwind CSS 4
- Supabase PostgreSQL and Realtime
- TanStack Query v5
- Zustand
- Framer Motion
- Recharts

## Features

- Responsive market browsing and detail views
- Virtual betting with optimistic UI updates
- App-managed login and signup backed by the `users` table
- Portfolio dashboard with ROI and transaction history
- Leaderboard rankings sourced from the database
- Admin market resolution flow
- Realtime market odds updates

## Project Structure

- `app/` - pages, layouts, and API routes
- `components/` - reusable UI components
- `hooks/` - data and mutation hooks
- `lib/` - utilities, API fetchers, and Supabase clients
- `stores/` - client-side state
- `types/` - shared TypeScript interfaces
- `database/` - schema, procedures, and seed SQL

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project

## Environment Variables

Create a `.env.local` file from `.env.local.example` and fill in your Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

Example:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-long-random-secret-at-least-32-chars
```

## Database Setup

1. Create a new Supabase project.
2. Open the SQL editor.
3. Run the files in this order:
   1. `database/schema.sql`
   2. `database/procedures.sql`
   3. `database/seeds.sql` if you want starter data
4. Make sure the `users` table, RLS policies, and seed data are imported successfully.

Notes:

- The schema creates users, categories, markets, bets, transactions, comments, leaderboard scores, and admin logs.
- The procedures file contains the probability and payout helpers plus the market resolution logic.
- The current app uses database-driven profiles, so signup creates a user row with a hashed password and a signed app session cookie.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

## Vercel Deploy

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add the following environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `JWT_SECRET`
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL.
5. Run the SQL schema and seed files in Supabase before testing the deployed app.
6. Deploy and verify signup, login, logout, market navigation, and bet placement.

## Build For Production

```bash
npm run build
npm run start
```

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint
- `npm run type-check` - run TypeScript checks
- `npm run db:types` - generate Supabase TypeScript types

## Typical Local Workflow

1. Install dependencies with `npm install`.
2. Add your Supabase credentials to `.env.local`.
3. Import the SQL schema and procedures into Supabase.
4. Start the app with `npm run dev`.
5. Sign up or log in.
6. Browse markets, place bets, and view your portfolio.

## Key Routes

- `/` - homepage
- `/markets` - market list
- `/markets/[id]` - market detail and bet panel
- `/portfolio` - user portfolio
- `/leaderboard` - rankings
- `/admin` - admin dashboard
- `/login` - login screen
- `/signup` - signup screen

## Notes

- The app is designed for virtual currency only.
- Market odds and portfolio changes are optimistic on the client and then reconciled through the API.
- The codebase uses strict TypeScript, so generated Supabase types or local row casts may be needed when you add new queries.
- The middleware file currently works, but Next.js warns that the convention is deprecated in favor of `proxy`.

## Troubleshooting

- If login or signup fails, verify the Supabase URL, anon key, service role key, and `JWT_SECRET` in `.env.local`.
- If database queries fail, confirm the SQL schema and procedures were imported successfully.
- If TypeScript complains about Supabase query results, add local row interfaces that match the selected columns.
- If the navbar shows stale wallet data after logout, hard refresh once after updating to the latest code.
