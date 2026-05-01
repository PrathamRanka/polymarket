import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApiError, ApiSuccess, Bet, Portfolio, Transaction, User } from "@/types";

interface PortfolioProfileRow {
  id: string;
  username: string;
  email: string;
  wallet_balance: number | string;
  streak_count: number | string;
  rank: User["rank"];
  created_at: string;
}

interface PortfolioBetRow {
  id: string;
  user_id: string;
  market_id: string;
  side: Bet["side"];
  amount: number | string;
  shares: number | string;
  potential_payout: number | string;
  status: Bet["status"];
  created_at: string;
}

interface PortfolioTransactionRow {
  id: string;
  user_id: string;
  type: Transaction["type"];
  amount: number | string;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export async function GET(): Promise<NextResponse<ApiSuccess<Portfolio> | ApiError>> {
  try {
    const supabase = getSupabaseAdminClient();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const userId = await verifySessionToken(sessionToken);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED", status: 401 },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id,username,email,wallet_balance,streak_count,rank,created_at")
      .eq("id", userId)
      .single();

    const profileRow = profile as PortfolioProfileRow | null;

    if (profileError || !profileRow) {
      return NextResponse.json(
        { error: "Profile not found", code: "PROFILE_NOT_FOUND", status: 404 },
        { status: 404 },
      );
    }

    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("id,user_id,market_id,side,amount,shares,potential_payout,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (betsError) {
      return NextResponse.json(
        { error: "Unable to fetch bets", code: "BETS_FETCH_FAILED", status: 500 },
        { status: 500 },
      );
    }

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id,user_id,type,amount,reference_id,description,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (txError) {
      return NextResponse.json(
        {
          error: "Unable to fetch transactions",
          code: "TRANSACTIONS_FETCH_FAILED",
          status: 500,
        },
        { status: 500 },
      );
    }

    const allBets: Bet[] = (bets ?? []).map((bet: PortfolioBetRow) => ({
      id: bet.id,
      user_id: bet.user_id,
      market_id: bet.market_id,
      side: bet.side as Bet["side"],
      amount: Number(bet.amount),
      shares: Number(bet.shares),
      potential_payout: Number(bet.potential_payout),
      status: bet.status as Bet["status"],
      created_at: bet.created_at,
    }));

    const openBets = allBets.filter((bet) => bet.status === "OPEN");
    const closedBets = allBets.filter((bet) => bet.status !== "OPEN");

    const totalWagered = allBets.reduce((acc, bet) => acc + bet.amount, 0);
    const totalWon = closedBets
      .filter((bet) => bet.status === "WON")
      .reduce((acc, bet) => acc + bet.potential_payout, 0);
    const totalLost = closedBets
      .filter((bet) => bet.status === "LOST")
      .reduce((acc, bet) => acc + bet.amount, 0);
    const roi = totalWagered > 0 ? ((totalWon - totalLost) / totalWagered) * 100 : 0;

    const profileUser: User = {
      id: profileRow.id,
      username: profileRow.username,
      email: profileRow.email,
      wallet_balance: Number(profileRow.wallet_balance),
      streak_count: Number(profileRow.streak_count),
      rank: profileRow.rank,
      created_at: profileRow.created_at,
    };

    const txRows: Transaction[] = (transactions ?? []).map((tx: PortfolioTransactionRow) => ({
      id: tx.id,
      user_id: tx.user_id,
      type: tx.type as Transaction["type"],
      amount: Number(tx.amount),
      reference_id: tx.reference_id,
      description: tx.description,
      created_at: tx.created_at,
    }));

    return NextResponse.json({
      data: {
        user: profileUser,
        open_bets: openBets,
        closed_bets: closedBets,
        total_wagered: totalWagered,
        total_won: totalWon,
        total_lost: totalLost,
        roi,
        transactions: txRows,
      },
    });
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
