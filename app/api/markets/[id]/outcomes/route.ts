import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: outcomes, error: outcomesError } = await supabase
      .from("market_outcomes")
      .select("id, label")
      .eq("market_id", id);

    if (outcomesError) throw outcomesError;

    interface Outcome {
      id: string;
      label: string;
    }
    interface BetRecord {
      amount: number | null;
    }
    const stakeData = await Promise.all(
      (outcomes || []).map(async (outcome: Outcome) => {
        const { data: bets, error: betsError } = await supabase
          .from("bets")
          .select("amount")
          .eq("outcome_id", outcome.id)
          .eq("status", "OPEN");

        if (betsError) throw betsError;

        const stake = (bets || []).reduce((sum, bet: BetRecord) => sum + Number(bet.amount || 0), 0);
        return {
          id: outcome.id,
          label: outcome.label,
          stake,
        };
      })
    );

    return NextResponse.json(stakeData);
  } catch (error) {
    console.error("Outcome stakes error:", error);
    return NextResponse.json({ error: "Failed to fetch outcome stakes" }, { status: 500 });
  }
}
