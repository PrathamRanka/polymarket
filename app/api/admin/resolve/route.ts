import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApiError, ApiSuccess } from "@/types";

const bodySchema = z.object({
  market_id: z.string().uuid(),
  winning_side: z.enum(["YES", "NO"]),
});

interface AdminActorRow {
  id: string;
  rank: string;
  email: string;
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiSuccess<{ resolved: true; market_id: string }> | ApiError>> {
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

    const { data: actor, error: actorError } = await supabase
      .from("users")
      .select("id,rank,email")
      .eq("id", userId)
      .maybeSingle();

    const actorRow = actor as AdminActorRow | null;

    if (actorError || !actorRow) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND", status: 404 },
        { status: 404 },
      );
    }

    const isAdmin = actorRow.rank === "Legend" || actorRow.email === "admin@predictmarket.com";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN", status: 403 },
        { status: 403 },
      );
    }

    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);
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

    const rpcClient = supabase as typeof supabase & {
      rpc: (
        procedure: string,
        args: {
          p_market_id: string;
          p_winning_side: "YES" | "NO";
          p_admin_id: string;
        },
      ) => Promise<{ error: { message: string } | null }>;
    };

    const { error } = await rpcClient.rpc("resolve_market", {
      p_market_id: parsed.data.market_id,
      p_winning_side: parsed.data.winning_side,
      p_admin_id: actorRow.id,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message || "Failed to resolve market",
          code: "RESOLVE_FAILED",
          status: 400,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: {
        resolved: true,
        market_id: parsed.data.market_id,
      },
      message: "Market resolved",
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
