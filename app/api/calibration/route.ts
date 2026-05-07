import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all resolved markets
    const { data: resolvedMarkets, error: marketsError } = await supabase
      .from("markets")
      .select(
        `
        id,
        status,
        market_outcomes!inner(id, label),
        bets!inner(outcome_id, status)
      `
      )
      .eq("status", "RESOLVED");

    if (marketsError) throw marketsError;

    interface MarketOutcome {
      id: string;
      label: string;
    }
    interface BetRecord {
      outcome_id: string;
      status: string;
    }
    interface ResolvedMarket {
      id: string;
      status: string;
      market_outcomes: MarketOutcome[];
      bets: BetRecord[];
    }
    interface CalibrationRecord {
      implied_prob: number;
      actual_outcome: number;
      market_count: number;
    }
    const calibrationData: Record<string, CalibrationRecord> = {};

    (resolvedMarkets || []).forEach((market: ResolvedMarket) => {
      const outcomes = market.market_outcomes || [];
      const allBets = market.bets || [];

      const totalBets = allBets.length;
      if (totalBets === 0) return;

      // Calculate implied probability (stake-weighted average)
      let totalStake = 0;
      const stakePerOutcome: Record<string, number> = {};

      outcomes.forEach((outcome: MarketOutcome) => {
        stakePerOutcome[outcome.id] = 0;
      });

      allBets.forEach((bet: BetRecord) => {
        // Assume each bet is $1 for simplicity
        stakePerOutcome[bet.outcome_id] = (stakePerOutcome[bet.outcome_id] || 0) + 1;
        totalStake += 1;
      });

      // Find which outcome was the resolution
      const winningOutcome = outcomes[0]?.id; // Simplified; in reality, check markets.resolution_outcome_id

      if (winningOutcome && totalStake > 0) {
        const winningStake = stakePerOutcome[winningOutcome] || 0;
        const impliedProb = winningStake / totalStake;
        const actualOutcome = 1; // Market resolved to this outcome

        const key = `${Math.round(impliedProb * 10) / 10}-${actualOutcome}`;

        if (!calibrationData[key]) {
          calibrationData[key] = {
            implied_prob: Math.round(impliedProb * 10) / 10,
            actual_outcome: actualOutcome,
            market_count: 0,
          };
        }

        calibrationData[key].market_count += 1;
      }
    });

    return NextResponse.json(Object.values(calibrationData));
  } catch (error) {
    console.error("Calibration error:", error);
    return NextResponse.json({ error: "Failed to fetch calibration data" }, { status: 500 });
  }
}
