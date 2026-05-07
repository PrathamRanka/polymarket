import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const userId = await verifySessionToken(sessionToken);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select(
        `
        id,
        market_id,
        status,
        amount,
        created_at,
        markets!inner(title)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (betsError) throw betsError;

    // Compute performance for each market
    interface BetRecord {
      id: string;
      market_id: string;
      status: string;
      amount: number | null;
      created_at: string;
      markets: { title: string };
    }
    const performance = (bets || []).map((bet: BetRecord) => ({
      market_title: bet.markets?.title || "Unknown Market",
      pnl: bet.status === "WON" ? Number(bet.amount || 0) * 1.5 : bet.status === "LOST" ? -Number(bet.amount || 0) : 0,
      amount_bet: Number(bet.amount || 0),
      status: bet.status,
    }));

    return NextResponse.json(performance);
  } catch (error) {
    console.error("Performance breakdown error:", error);
    return NextResponse.json({ error: "Failed to fetch performance" }, { status: 500 });
  }
}
