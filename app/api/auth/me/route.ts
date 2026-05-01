import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApiError, ApiSuccess, User } from "@/types";

interface MeProfileRow {
  id: string;
  username: string;
  email: string;
  wallet_balance: number | string;
  streak_count: number | string;
  rank: User["rank"];
  created_at: string;
}

export async function GET(): Promise<NextResponse<ApiSuccess<{ user: User }> | ApiError>> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const userId = await verifySessionToken(sessionToken);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED", status: 401 },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error } = await supabase
      .from("users")
      .select("id,username,email,wallet_balance,streak_count,rank,created_at")
      .eq("id", userId)
      .maybeSingle();

    const profileRow = profile as MeProfileRow | null;

    if (error || !profileRow) {
      return NextResponse.json(
        { error: "Profile not found", code: "PROFILE_NOT_FOUND", status: 404 },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        user: {
          id: profileRow.id,
          username: profileRow.username,
          email: profileRow.email,
          wallet_balance: Number(profileRow.wallet_balance),
          streak_count: Number(profileRow.streak_count),
          rank: profileRow.rank,
          created_at: profileRow.created_at,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        status: 500,
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}