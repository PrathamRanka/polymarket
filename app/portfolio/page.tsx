import { redirect } from "next/navigation";

import ROIChart from "@/components/portfolio/ROIChart";
import { createClient } from "@/lib/supabase/server";
import { formatCoins } from "@/lib/utils";
import type { Portfolio } from "@/types";

async function getPortfolio(): Promise<Portfolio | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/portfolio`, {
    cache: "no-store",
    headers: {
      cookie: "",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data: Portfolio };
  return payload.data;
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
