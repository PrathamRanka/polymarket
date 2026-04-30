import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { calculateProbability } from "@/lib/utils";
import type { ApiError, ApiSuccess, Market, MarketStatus } from "@/types";

interface Params {
  params: Promise<{ id: string }>;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface MarketRow {
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

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse<ApiSuccess<Market> | ApiError>> {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("markets")
      .select("id,title,description,category_id,creator_id,yes_volume,no_volume,expires_at,status,created_at,categories(id,name,slug,icon)")
      .eq("id", id)
      .single();

    const marketRow = data as MarketRow | null;

    if (error || !marketRow) {
      return NextResponse.json(
        {
          error: "Market not found",
          code: "MARKET_NOT_FOUND",
          status: 404,
        },
        { status: 404 },
      );
    }

    const yesVolume = Number(marketRow.yes_volume ?? 0);
    const noVolume = Number(marketRow.no_volume ?? 0);
    const categoryRow = Array.isArray(marketRow.categories) ? marketRow.categories[0] : marketRow.categories;

    const market: Market = {
      id: marketRow.id,
      title: marketRow.title,
      description: marketRow.description,
      category: {
        id: categoryRow?.id ?? "",
        name: categoryRow?.name ?? "Unknown",
        slug: categoryRow?.slug ?? "unknown",
        icon: categoryRow?.icon ?? "❓",
      },
      creator_id: marketRow.creator_id,
      yes_volume: yesVolume,
      no_volume: noVolume,
      yes_probability: calculateProbability(yesVolume, noVolume),
      expires_at: marketRow.expires_at,
      status: marketRow.status,
      created_at: marketRow.created_at,
    };

    return NextResponse.json({ data: market });
  } catch {
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        status: 500,
      },
      { status: 500 },
    );
  }
}
