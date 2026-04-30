import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { calculateProbability } from "@/lib/utils";
import type { ApiError, ApiSuccess, Market, MarketStatus } from "@/types";

interface Params {
  params: Promise<{ id: string }>;
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

    if (error || !data) {
      return NextResponse.json(
        {
          error: "Market not found",
          code: "MARKET_NOT_FOUND",
          status: 404,
        },
        { status: 404 },
      );
    }

    const yesVolume = Number(data.yes_volume ?? 0);
    const noVolume = Number(data.no_volume ?? 0);
    const categoryRow = Array.isArray(data.categories) ? data.categories[0] : data.categories;

    const market: Market = {
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
      yes_probability: calculateProbability(yesVolume, noVolume),
      expires_at: data.expires_at,
      status: data.status as MarketStatus,
      created_at: data.created_at,
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
