import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import ROIChart from "@/components/portfolio/ROIChart";
import { PortfolioCharts } from "@/components/portfolio/PortfolioCharts";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatCoins } from "@/lib/utils";
import type { Portfolio } from "@/types";

interface PortfolioProfileRow {
  id: string;
  username: string;
  email: string;
  wallet_balance: number | string;
  streak_count: number | string;
  rank: Portfolio["user"]["rank"];
  created_at: string;
}

interface PortfolioPageBetRow {
  id: string;
  user_id: string;
  market_id: string;
  side: "YES" | "NO";
  amount: number | string;
  shares: number | string;
  potential_payout: number | string;
  status: "OPEN" | "WON" | "LOST" | "REFUNDED";
  created_at: string;
}

interface PortfolioPageTransactionRow {
  id: string;
  user_id: string;
  type: "BET_PLACED" | "BET_WON" | "BET_REFUND" | "SIGNUP_BONUS" | "DAILY_BONUS";
  amount: number | string;
  reference_id: string | null;
  description: string;
  created_at: string;
}

async function getPortfolio(): Promise<Portfolio | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(sessionToken);

  if (!userId) return null;

  const supabase = getSupabaseAdminClient();

  const [{ data: profile, error: profileError }, { data: bets, error: betsError }, { data: transactions, error: txError }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id,username,email,wallet_balance,streak_count,rank,created_at")
        .eq("id", userId)
        .single(),
      supabase
        .from("bets")
        .select("id,user_id,market_id,side,amount,shares,potential_payout,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id,user_id,type,amount,reference_id,description,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (profileError || betsError || txError || !profile) {
    return null;
  }

  const profileRow = profile as PortfolioProfileRow;
  const betRows = (bets ?? []) as PortfolioPageBetRow[];
  const transactionRows = (transactions ?? []) as PortfolioPageTransactionRow[];

  const openBets = betRows
    .map((bet) => ({
      id: bet.id,
      user_id: bet.user_id,
      market_id: bet.market_id,
      side: bet.side,
      amount: Number(bet.amount),
      shares: Number(bet.shares),
      potential_payout: Number(bet.potential_payout),
      status: bet.status,
      created_at: bet.created_at,
    }))
    .filter((bet) => bet.status === "OPEN");

  const closedBets = betRows
    .map((bet) => ({
      id: bet.id,
      user_id: bet.user_id,
      market_id: bet.market_id,
      side: bet.side,
      amount: Number(bet.amount),
      shares: Number(bet.shares),
      potential_payout: Number(bet.potential_payout),
      status: bet.status,
      created_at: bet.created_at,
    }))
    .filter((bet) => bet.status !== "OPEN");

  const totalWagered = openBets.concat(closedBets).reduce((acc, bet) => acc + bet.amount, 0);
  const totalWon = closedBets.filter((bet) => bet.status === "WON").reduce((acc, bet) => acc + bet.potential_payout, 0);
  const totalLost = closedBets.filter((bet) => bet.status === "LOST").reduce((acc, bet) => acc + bet.amount, 0);
  const roi = totalWagered > 0 ? ((totalWon - totalLost) / totalWagered) * 100 : 0;

  return {
    user: {
      id: profileRow.id,
      username: profileRow.username,
      email: profileRow.email,
      wallet_balance: Number(profileRow.wallet_balance),
      streak_count: Number(profileRow.streak_count),
      rank: profileRow.rank,
      created_at: profileRow.created_at,
    },
    open_bets: openBets,
    closed_bets: closedBets,
    total_wagered: totalWagered,
    total_won: totalWon,
    total_lost: totalLost,
    roi,
    transactions: transactionRows.map((tx) => ({
      id: tx.id,
      user_id: tx.user_id,
      type: tx.type,
      amount: Number(tx.amount),
      reference_id: tx.reference_id,
      description: tx.description,
      created_at: tx.created_at,
    })),
  };
}

export default async function PortfolioPage() {
  const portfolio = await getPortfolio();

  if (!portfolio) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Portfolio</h1>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Wallet Balance</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{formatCoins(portfolio.user.wallet_balance)}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Wagered</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{formatCoins(portfolio.total_wagered)}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Won</p>
          <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCoins(portfolio.total_won)}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">ROI</p>
          <p className={`mt-2 text-lg font-semibold ${portfolio.roi >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {portfolio.roi.toFixed(2)}%
          </p>
        </article>
      </section>

      <ROIChart transactions={portfolio.transactions} />

      <Suspense fallback={<div className="text-zinc-400">Loading portfolio analytics...</div>}>
        <PortfolioCharts />
      </Suspense>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-lg font-semibold text-zinc-100">Open Positions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr>
                <th className="py-2">Market</th>
                <th className="py-2">Side</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Potential</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.open_bets.map((bet) => (
                <tr key={bet.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="py-2">{bet.market_id}</td>
                  <td className="py-2">{bet.side}</td>
                  <td className="py-2">{formatCoins(bet.amount)}</td>
                  <td className="py-2">{formatCoins(bet.potential_payout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
