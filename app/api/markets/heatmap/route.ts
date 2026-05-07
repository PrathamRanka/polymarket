import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all bets grouped by category and day of week
    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select(
        `
        id,
        amount,
        created_at,
        markets!inner(
          id,
          category_id,
          categories!inner(name)
        )
      `
      )
      .eq("status", "OPEN");

    if (betsError) throw betsError;

    interface Category {
      name: string;
    }
    interface Market {
      id: string;
      category_id: string;
      categories: Category;
    }
    interface BetRecord {
      id: string;
      amount: number;
      created_at: string;
      markets: Market;
    }
    interface HeatmapEntry {
      day_of_week: number;
      category: string;
      volume: number;
      market_count: number;
    }
    const heatmapData: Record<string, HeatmapEntry> = {};

    (bets || []).forEach((bet: BetRecord) => {
      const date = new Date(bet.created_at);
      const dayOfWeek = date.getDay() || 0; // 0-6
      const categoryName = bet.markets?.categories?.name || "Other";

      const key = `${dayOfWeek}-${categoryName}`;

      if (!heatmapData[key]) {
        heatmapData[key] = {
          day_of_week: dayOfWeek,
          category: categoryName,
          volume: 0,
          market_count: 0,
        };
      }

      heatmapData[key].volume += Number(bet.amount || 0);
      heatmapData[key].market_count += 1;
    });

    return NextResponse.json(Object.values(heatmapData));
  } catch (error) {
    console.error("Market heatmap error:", error);
    return NextResponse.json({ error: "Failed to fetch market heatmap" }, { status: 500 });
  }
}
