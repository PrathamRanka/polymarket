import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import BetPanel from "@/components/market/BetPanel";
import CommentSection from "@/components/market/CommentSection";
import OddsChart from "@/components/market/OddsChart";
import { createClient } from "@/lib/supabase/server";
import { formatCoins, formatTimeLeft, getMarketStatusColor } from "@/lib/utils";
import type { Market, MarketStatus } from "@/types";

interface Params {
  params: Promise<{ id: string }>;
}

async function getMarket(id: string): Promise<Market | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("markets")
    .select("id,title,description,category_id,creator_id,yes_volume,no_volume,expires_at,status,created_at,categories(id,name,slug,icon)")
    .eq("id", id)
    .single();

  if (!data) return null;

  const categoryRow = Array.isArray(data.categories) ? data.categories[0] : data.categories;
  const yesVolume = Number(data.yes_volume ?? 0);
  const noVolume = Number(data.no_volume ?? 0);
  const total = yesVolume + noVolume;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: {
      id: categoryRow?.id ?? "",
      name: categoryRow?.name ?? "Unknown",
      slug: categoryRow?.slug ?? "unknown",
      icon: categoryRow?.icon ?? "❓",
    },
    creator_id: data.creator_id,
    yes_volume: yesVolume,
    no_volume: noVolume,
    yes_probability: total > 0 ? yesVolume / total : 0.5,
    expires_at: data.expires_at,
    status: data.status as MarketStatus,
    created_at: data.created_at,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const market = await getMarket(id);

  return {
    title: market?.title ?? "Market",
    description: market?.description ?? "PredictMarket market detail",
  };
}

export default async function MarketDetailPage({ params }: Params) {
  const { id } = await params;
  const market = await getMarket(id);

  if (!market) {
    notFound();
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <section className="space-y-4">
        <header className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
              {market.category.icon} {market.category.name}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs ${getMarketStatusColor(market.status)}`}>{market.status}</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100">{market.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">Expires in {formatTimeLeft(market.expires_at)}</p>
        </header>

        <OddsChart marketId={market.id} currentProb={market.yes_probability} />

        <section className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-3">
          <article>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Total Volume</p>
            <p className="mt-1 text-sm font-medium text-zinc-200">{formatCoins(market.yes_volume + market.no_volume)}</p>
          </article>
          <article>
            <p className="text-xs uppercase tracking-wide text-zinc-500">YES Volume</p>
            <p className="mt-1 text-sm font-medium text-emerald-300">{formatCoins(market.yes_volume)}</p>
          </article>
          <article>
            <p className="text-xs uppercase tracking-wide text-zinc-500">NO Volume</p>
            <p className="mt-1 text-sm font-medium text-rose-300">{formatCoins(market.no_volume)}</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-lg font-semibold text-zinc-100">Description</h2>
          <p className="mt-2 text-sm text-zinc-300">{market.description}</p>
        </section>

        <Suspense fallback={<div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-zinc-400">Loading comments...</div>}>
          <CommentSection marketId={market.id} />
        </Suspense>
      </section>

      <section className="space-y-4">
        <BetPanel market={market} />
      </section>
    </main>
  );
}
