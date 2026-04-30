import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, LeaderboardEntry, UserRank } from "@/types";

export const revalidate = 60;

export async function GET(request: Request): Promise<NextResponse<ApiSuccess<LeaderboardEntry[]> | ApiError>> {
  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(100, Math.max(1, limitValue));

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_leaderboard_report", {
      p_limit: limit,
    });

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch leaderboard",
          code: "LEADERBOARD_FETCH_FAILED",
          status: 500,
        },
        { status: 500 },
      );
    }

    const entries: LeaderboardEntry[] = (data ?? []).map(
      (row: {
        rank: number;
        username: string;
        score: number;
        wins: number;
        losses: number;
        win_rate: number;
        streak: number;
      }) => {
        const wins = Number(row.wins);
        const losses = Number(row.losses);
        const total = wins + losses;
        const safeWinRate = total > 0 ? wins / total : 0;

        return {
          rank: Number(row.rank),
          user: {
            id: `leader-${row.rank}`,
            username: row.username,
            rank: "Novice" as UserRank,
            streak_count: Number(row.streak),
          },
          score: Number(row.score),
          wins,
          losses,
          win_rate: safeWinRate,
          total_wagered: 0,
        };
      },
    );

    return NextResponse.json(
      { data: entries },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=60" } },
    );
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
