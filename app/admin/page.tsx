import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatCoins } from "@/lib/utils";

interface AdminMarketRow {
  id: string;
  title: string;
  status: string;
  yes_volume: number | string;
  no_volume: number | string;
  expires_at: string;
}

interface AdminProfileRow {
  rank: string;
  email: string;
}

async function getAdminData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("rank,email")
    .eq("id", user.id)
    .single();

  const profileRow = profile as AdminProfileRow | null;

  if (!profileRow || (profileRow.rank !== "Legend" && profileRow.email !== "admin@predictmarket.com")) {
    return "forbidden" as const;
  }

  const [{ count: markets = 0 }, { count: users = 0 }, { count: betsToday = 0 }] = await Promise.all([
    supabase.from("markets").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("bets")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const { data: marketRows } = await supabase
    .from("markets")
    .select("id,title,status,yes_volume,no_volume,expires_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return {
    markets,
    users,
    betsToday,
    marketRows: (marketRows ?? []) as AdminMarketRow[],
  };
}

export default async function AdminPage() {
  const data = await getAdminData();

  if (!data) {
    redirect("/login");
  }

  if (data === "forbidden") {
    redirect("/markets");
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Admin Dashboard</h1>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Markets</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{data.markets}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total Users</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{data.users}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Bets Today</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{data.betsToday}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Circulating Coins</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{formatCoins(0)}</p>
        </article>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-lg font-semibold text-zinc-100">Market Management</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr>
                <th className="py-2">Title</th>
                <th className="py-2">Status</th>
                <th className="py-2">Volume</th>
                <th className="py-2">Expires</th>
              </tr>
            </thead>
            <tbody>
              {data.marketRows.map((market) => (
                <tr key={market.id} className="border-t border-zinc-800 text-zinc-200">
                  <td className="py-2">{market.title}</td>
                  <td className="py-2">{market.status}</td>
                  <td className="py-2">{formatCoins(Number(market.yes_volume) + Number(market.no_volume))}</td>
                  <td className="py-2">{new Date(market.expires_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
