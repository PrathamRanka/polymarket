import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApiError, ApiSuccess } from "@/types";

const bodySchema = z.object({
  content: z.string().trim().min(1).max(500),
});

interface Params {
  params: Promise<{ id: string }>;
}

interface AdminActorRow {
  id: string;
}

interface CommentInsertRow {
  user_id: string;
  market_id: string;
  content: string;
}

export async function POST(
  request: Request,
  { params }: Params,
): Promise<NextResponse<ApiSuccess<{ created: true; market_id: string; comment_id: string }> | ApiError>> {
  try {
    const { id: marketId } = await params;
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
    const { data: actor, error: actorError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    const actorRow = actor as AdminActorRow | null;

    if (actorError || !actorRow) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND", status: 404 },
        { status: 404 },
      );
    }

    const commentsClient = supabase as any;

    const { data, error } = await commentsClient
      .from("comments")
      .insert({
        user_id: actorRow.id,
        market_id: marketId,
        content: parsed.data.content,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message ?? "Failed to post comment",
          code: "COMMENT_CREATE_FAILED",
          status: 400,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: {
        created: true,
        market_id: marketId,
        comment_id: data.id,
      },
      message: "Comment posted",
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