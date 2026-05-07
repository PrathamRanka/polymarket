import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get market to find creation date
    const { data: market, error: marketError } = await supabase
      .from("markets")
      .select("created_at")
      .eq("id", id)
      .single();

    interface MarketRecord {
      created_at: string;
    }
    if (marketError || !market) throw marketError;

    const startDate = new Date((market as MarketRecord).created_at);
    const endDate = new Date();

    const liquidityHistory = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);

      interface BetAmount {
        amount: number | null;
      }
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select("amount")
        .eq("market_id", id)
        .gte("created_at", current.toISOString())
        .lt("created_at", nextDay.toISOString())
        .eq("status", "OPEN");

      if (betsError) throw betsError;

      const totalStake = (bets || []).reduce((sum, bet: BetAmount) => sum + Number(bet.amount || 0), 0);

      liquidityHistory.push({
        timestamp: current.toISOString(),
        total_stake: totalStake,
      });

      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json(liquidityHistory);
  } catch (error) {
    console.error("Liquidity history error:", error);
    return NextResponse.json({ error: "Failed to fetch liquidity history" }, { status: 500 });
  }
}
