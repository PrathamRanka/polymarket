import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApiError, ApiSuccess, User, UserRank } from "@/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

interface LoginProfileRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
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

    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id,username,email,password_hash,wallet_balance,streak_count,rank,created_at")
      .eq("email", parsed.data.email)
      .maybeSingle();

    const profileRow = profile as LoginProfileRow | null;

    if (profileError || !profileRow) {
      console.error("[LOGIN] Profile lookup error:", profileError);
      return NextResponse.json(
        { 
          error: "Invalid email or password", 
          code: "INVALID_CREDENTIALS", 
          status: 401,
          debug: profileError?.message,
        },
        { status: 401 },
      );
    }

    const passwordMatches = await verifyPassword(parsed.data.password, profileRow.password_hash);

    if (!passwordMatches) {
      return NextResponse.json(
        { 
          error: "Invalid email or password", 
          code: "INVALID_CREDENTIALS", 
          status: 401,
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
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

    const sessionToken = await createSessionToken(profileRow.id);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    console.error("[LOGIN] Catch block error:", error instanceof Error ? error.message : error);
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