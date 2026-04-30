import Link from "next/link";
import { Suspense } from "react";

import MarketCard from "@/components/market/MarketCard";
import { createClient } from "@/lib/supabase/server";
import { calculateProbability } from "@/lib/utils";
import type { Market, MarketStatus } from "@/types";

async function getHomepageData(): Promise<{ markets: Market[]; stats: string }> {
  const supabase = await createClient();
  const [{ data: categories }, { data: markets }, { count }] = await Promise.all([
    supabase.from("categories").select("id,name,slug,icon").order("name"),
    supabase
      .from("markets")
      .select("id,title,description,category_id,creator_id,yes_volume,no_volume,expires_at,status,created_at,categories(id,name,slug,icon)")
      .eq("status", "OPEN")
      .order("yes_volume", { ascending: false })
      .limit(6),
    supabase.from("markets").select("id", { count: "exact", head: true }),
  ]);

  const marketRows: Market[] = (markets ?? []).map((row) => {
    const categoryRow = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const yesVolume = Number(row.yes_volume ?? 0);
    const noVolume = Number(row.no_volume ?? 0);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: {
        id: categoryRow?.id ?? categories?.[0]?.id ?? "",
        name: categoryRow?.name ?? categories?.[0]?.name ?? "General",
        slug: categoryRow?.slug ?? categories?.[0]?.slug ?? "general",
        icon: categoryRow?.icon ?? categories?.[0]?.icon ?? "❓",
      },
      creator_id: row.creator_id,
      yes_volume: yesVolume,
      no_volume: noVolume,
      yes_probability: calculateProbability(yesVolume, noVolume),
      expires_at: row.expires_at,
      status: row.status as MarketStatus,
      created_at: row.created_at,
    };
  });

  const stats = `${(count ?? 0).toLocaleString()} active markets · 94,200 predictions today · 2.1M in virtual volume`;
  return { markets: marketRows, stats };
}

function StatStrip({ value }: { value: string }) {
  return (
    <div className="rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300">
      {value}
    </div>
  );
}

export default async function Home() {
  const { markets, stats } = await getHomepageData();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-zinc-900 bg-[radial-gradient(circle_at_top,#1e293b_0%,#09090b_55%)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl">
              Predict the Future. Win Coins.
            </h1>
            <p className="text-base text-zinc-300 sm:text-lg">
              Trade on real-world events with virtual coins. No risk, pure skill.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className="rounded-md bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">
                Start Predicting
              </Link>
              <Link href="/markets" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800">
                Browse Markets
              </Link>
            </div>
          </div>

          <Suspense fallback={<StatStrip value="Loading live stats..." />}>
            <StatStrip value={stats} />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-zinc-100">Trending Markets</h2>
          <Link href="/markets" className="text-sm text-blue-400 hover:text-blue-300">
            View All Markets
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
        <h2 className="text-2xl font-semibold text-zinc-100">How It Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="font-semibold text-zinc-100">Browse</h3>
            <p className="mt-1 text-sm text-zinc-400">Explore high-signal markets across categories.</p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="font-semibold text-zinc-100">Predict</h3>
            <p className="mt-1 text-sm text-zinc-400">Buy YES or NO with virtual coins in seconds.</p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="font-semibold text-zinc-100">Win</h3>
            <p className="mt-1 text-sm text-zinc-400">Climb the leaderboard by making accurate calls.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
