import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calculateProbability } from "@/lib/utils";
import type { ApiError, ApiSuccess, CreateMarketFormValues, Market, MarketStatus } from "@/types";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface MarketRow {
  id: string;
  title: string;
  description: string;
  category_id: string;
  creator_id: string;
  yes_volume: number | string | null;
  no_volume: number | string | null;
  image_url?: string | null;
  expires_at: string;
  status: MarketStatus;
  created_at: string;
  categories: CategoryRow[] | CategoryRow | null;
}

interface MarketInsertRow {
  title: string;
  description: string;
  category_id: string;
  creator_id: string;
  expires_at: string;
}

interface MarketInsertedRow extends MarketInsertRow {
  id: string;
  yes_volume: number | string | null;
  no_volume: number | string | null;
  image_url?: string | null;
  status: MarketStatus;
  created_at: string;
  categories: CategoryRow[] | CategoryRow | null;
}

export const revalidate = 30;

const createMarketSchema = z
  .object({
    title: z.string().min(10).max(200),
    description: z.string().min(20).max(2000),
    category_id: z.string().uuid(),
    image_url: z.string().url().optional(),
    expires_at: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.expires_at).getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "Expiry must be in the future",
      });
    }
  });

function errorResponse(payload: ApiError): NextResponse<ApiError> {
  return NextResponse.json(payload, { status: payload.status });
}

export async function GET(request: Request): Promise<NextResponse<ApiSuccess<Market[]> | ApiError>> {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status") as MarketStatus | null;
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  try {
    const supabase = await createClient();

    let query = supabase
      .from("markets")
      .select("id,title,description,category_id,creator_id,yes_volume,no_volume,image_url,expires_at,status,created_at,categories(id,name,slug,icon)")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category_id", category);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return errorResponse({
        error: `Failed to fetch markets: ${error.message}`,
        code: "MARKET_FETCH_FAILED",
        status: 500,
      });
    }

    const markets: Market[] = (data ?? []).map((row: MarketRow) => {
      const yesVolume = Number(row.yes_volume ?? 0);
      const noVolume = Number(row.no_volume ?? 0);
      const categoryRow = Array.isArray(row.categories) ? row.categories[0] : row.categories;

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: {
          id: categoryRow?.id ?? "",
          name: categoryRow?.name ?? "Unknown",
          slug: categoryRow?.slug ?? "unknown",
          icon: categoryRow?.icon ?? "❓",
        },
        creator_id: row.creator_id,
        yes_volume: yesVolume,
        no_volume: noVolume,
        yes_probability: calculateProbability(yesVolume, noVolume),
        image_url: row.image_url ?? null,
        expires_at: row.expires_at,
        status: row.status as MarketStatus,
        created_at: row.created_at,
      };
    });

    return NextResponse.json(
      {
        data: markets,
        message: `Fetched ${markets.length} markets`,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse({
      error: `Internal server error: ${msg}`,
      code: "INTERNAL_SERVER_ERROR",
      status: 500,
    });
  }
}

export async function POST(request: Request): Promise<NextResponse<ApiSuccess<Market> | ApiError>> {
  try {
    const supabase = getSupabaseAdminClient();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const userId = await verifySessionToken(sessionToken);

    if (!userId) {
      return errorResponse({ error: "Unauthorized", code: "UNAUTHORIZED", status: 401 });
    }

    const body = (await request.json()) as CreateMarketFormValues;
    const parsed = createMarketSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse({
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }

    const marketsTable = supabase.from("markets") as unknown as {
      insert: (values: MarketInsertRow) => {
        select: (
          columns: string,
        ) => {
          single: () => Promise<{ data: MarketInsertedRow | null; error: { message: string } | null }>;
        };
      };
    };

    const insertPayload: MarketInsertRow & { image_url?: string } = {
      title: parsed.data.title,
      description: parsed.data.description,
      category_id: parsed.data.category_id,
      creator_id: userId,
      expires_at: parsed.data.expires_at,
    };

    if (parsed.data.image_url) {
      insertPayload.image_url = parsed.data.image_url;
    }

    const { data, error } = await marketsTable
      .insert(insertPayload)
      .select("id,title,description,category_id,creator_id,yes_volume,no_volume,expires_at,status,created_at,categories(id,name,slug,icon)")
      .single();

    if (error || !data) {
      return errorResponse({
        error: "Failed to create market",
        code: "MARKET_CREATE_FAILED",
        status: 500,
      });
    }

    const categoryRow = Array.isArray(data.categories) ? data.categories[0] : data.categories;

    const market: Market = {
      id: data.id,
      title: data.title,
      description: data.description,
      category: {
        id: categoryRow?.id ?? "",
        name: categoryRow?.name ?? "Unknown",
        slug: categoryRow?.slug ?? "unknown",
        icon: categoryRow?.icon ?? "❓",
      },
      creator_id: data.creator_id,
      yes_volume: Number(data.yes_volume ?? 0),
      no_volume: Number(data.no_volume ?? 0),
      yes_probability: calculateProbability(Number(data.yes_volume ?? 0), Number(data.no_volume ?? 0)),
      image_url: data.image_url ?? null,
      expires_at: data.expires_at,
      status: data.status as MarketStatus,
      created_at: data.created_at,
    };

    return NextResponse.json(
      {
        data: market,
        message: "Market created",
      },
      { status: 201 },
    );
  } catch {
    return errorResponse({
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      status: 500,
    });
  }
}
