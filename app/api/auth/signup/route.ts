import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, User } from "@/types";

const signupSchema = z.object({
  username: z.string().trim().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request): Promise<NextResponse<ApiSuccess<{ user: User }> | ApiError>> {
  try {
    const payload = await request.json();
    const parsed = signupSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid payload",
          code: "VALIDATION_ERROR",
          status: 400,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: authResult, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError || !authResult.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create account", code: "SIGNUP_FAILED", status: 400 },
        { status: 400 },
      );
    }

    const profileSeed = {
      id: authResult.user.id,
      username: parsed.data.username,
      email: parsed.data.email,
      password_hash: "supabase-auth-managed",
      wallet_balance: 1000,
      streak_count: 0,
      rank: "Novice" as const,
      last_active_at: new Date().toISOString(),
    };

    const usersTable = supabase.from("users") as unknown as {
      upsert: (
        values: typeof profileSeed,
        options?: { onConflict?: string },
      ) => Promise<{ error: { message: string } | null }>;
    };

    const { error: profileError } = await usersTable.upsert(profileSeed, { onConflict: "id" });

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to create profile", code: "PROFILE_CREATE_FAILED", status: 500 },
        { status: 500 },
      );
    }

    const user: User = {
      id: profileSeed.id,
      username: profileSeed.username,
      email: profileSeed.email,
      wallet_balance: profileSeed.wallet_balance,
      streak_count: profileSeed.streak_count,
      rank: profileSeed.rank,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        data: { user },
        message: "Account created",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR", status: 500 },
      { status: 500 },
    );
  }
}