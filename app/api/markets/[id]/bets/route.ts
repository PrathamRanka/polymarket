import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApiError, ApiSuccess, Bet, UserRank } from "@/types";

interface Params {
  params: Promise<{ id: string }>;
}

interface BetRow {
  id: string;
  user_id: string;
  market_id: string;
  side: Bet["side"];
  amount: number | string;
  shares: number | string;
  potential_payout: number | string;
  status: Bet["status"];
  created_at: string;
  users:
    | {
        username: string;
        rank: UserRank;
      }
    | {
        username: string;
        rank: UserRank;
      }[]
    | null;
}

type RecentBet = Bet & {
  user: {
    username: string;
    rank: UserRank;
  } | null;
};

export async function GET(
  request: Request,
  { params }: Params,
): Promise<NextResponse<ApiSuccess<RecentBet[]> | ApiError>> {
  const { id: marketId } = await params;

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 50)
    : 10;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("bets")
      .select("id,user_id,market_id,side,amount,shares,potential_payout,status,created_at,users(username,rank)")
      .eq("market_id", marketId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        {
          error: "Unable to fetch recent bets",
          code: "RECENT_BETS_FETCH_FAILED",
          status: 500,
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as BetRow[];
    const result: RecentBet[] = rows.map((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;

      return {
        id: row.id,
        user_id: row.user_id,
        market_id: row.market_id,
        side: row.side,
        amount: Number(row.amount),
        shares: Number(row.shares),
        potential_payout: Number(row.potential_payout),
        status: row.status,
        created_at: row.created_at,
        user: user
          ? {
              username: user.username,
              rank: user.rank,
            }
          : null,
      };
    });

    return NextResponse.json({ data: result });
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