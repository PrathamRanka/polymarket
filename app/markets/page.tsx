import Link from "next/link";

import MarketGrid from "@/components/market/MarketGrid";
import { createClient } from "@/lib/supabase/server";
import { calculateProbability } from "@/lib/utils";
import type { Market, MarketStatus } from "@/types";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface MarketsPageMarketRow {
  id: string;
  title: string;
  description: string;
  category_id: string;
  creator_id: string;
  yes_volume: number | string | null;
  no_volume: number | string | null;
  expires_at: string;
  status: MarketStatus;
  created_at: string;
  categories: CategoryRow[] | CategoryRow | null;
}

interface MarketsPageProps {
  searchParams?: Promise<{ category?: string; status?: MarketStatus }>;
}

export default async function MarketsPage({ searchParams }: MarketsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("markets")
    .select("id,title,description,category_id,creator_id,yes_volume,no_volume,expires_at,status,created_at,categories(id,name,slug,icon)")
    .order("created_at", { ascending: false });

  if (params?.category) {
    query = query.eq("category_id", params.category);
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data } = await query.limit(30);

  const markets: Market[] = (data ?? []).map((row: MarketsPageMarketRow) => {
    const categoryRow = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const yesVolume = Number(row.yes_volume ?? 0);
    const noVolume = Number(row.no_volume ?? 0);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: {
        id: categoryRow?.id ?? "",
        name: categoryRow?.name ?? "Unknown",
        slug: categoryRow?.slug ?? "unknown",
        icon: categoryRow?.icon ?? "❓",
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

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-100">Browse Markets</h1>
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
          Back to home
        </Link>
      </div>
      <MarketGrid markets={markets} />
    </main>
  );
}
