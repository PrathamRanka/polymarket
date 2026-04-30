import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, User, UserRank } from "@/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

interface LoginProfileRow {
  id: string;
  username: string;
  email: string;
  wallet_balance: number | string;
  streak_count: number | string;
  rank: string;
  created_at: string;
}

export async function POST(request: Request): Promise<NextResponse<ApiSuccess<{ user: User }> | ApiError>> {
  try {
    const payload = await request.json();
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid credentials",
          code: "VALIDATION_ERROR",
          status: 400,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError || !authResult.user) {
      return NextResponse.json(
        { error: "Invalid email or password", code: "INVALID_CREDENTIALS", status: 401 },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id,username,email,wallet_balance,streak_count,rank,created_at")
      .eq("id", authResult.user.id)
      .single();

    const profileRow = profile as LoginProfileRow | null;

    if (profileError || !profileRow) {
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
          rank: profileRow.rank as UserRank,
          created_at: profileRow.created_at,
        },
      },
      message: "Signed in",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR", status: 500 },
      { status: 500 },
    );
  }
}