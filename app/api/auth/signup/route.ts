import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME, createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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

    const supabase = getSupabaseAdminClient();

    const [{ data: existingEmail }, { data: existingUsername }] = await Promise.all([
      supabase.from("users").select("id").eq("email", parsed.data.email).maybeSingle(),
      supabase.from("users").select("id").eq("username", parsed.data.username).maybeSingle(),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already in use", code: "EMAIL_EXISTS", status: 409 },
        { status: 409 },
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already in use", code: "USERNAME_EXISTS", status: 409 },
        { status: 409 },
      );
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(parsed.data.password);
    const createdAt = new Date().toISOString();

    const profileSeed = {
      id: userId,
      username: parsed.data.username,
      email: parsed.data.email,
      password_hash: passwordHash,
      wallet_balance: 1000,
      streak_count: 0,
      rank: "Novice" as const,
      last_active_at: createdAt,
    };

    console.log("[SIGNUP] Creating profile:", profileSeed);

    const usersTable = supabase.from("users") as unknown as {
      insert: (values: typeof profileSeed) => Promise<{ error: { message: string } | null }>;
    };

    const { error: profileError } = await usersTable.insert(profileSeed);

    if (profileError) {
      console.error("[SIGNUP] Profile error:", profileError);
      return NextResponse.json(
        { 
          error: "Failed to create profile", 
          code: "PROFILE_CREATE_FAILED", 
          status: 500,
          debug: profileError?.message,
        },
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
      created_at: createdAt,
    };

    const response = NextResponse.json(
      {
        data: { user },
        message: "Account created",
      },
      { status: 201 },
    );

    const sessionToken = await createSessionToken(user.id);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    console.error("[SIGNUP] Catch block error:", error instanceof Error ? error.message : error);
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