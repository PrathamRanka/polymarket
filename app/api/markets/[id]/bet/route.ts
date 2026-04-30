import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { calculatePotentialPayout, calculateProbability } from "@/lib/utils";
import type { ApiError, ApiSuccess, Bet, BetSide } from "@/types";

interface Params {
  params: Promise<{ id: string }>;
}

const betSchema = z.object({
  side: z.enum(["YES", "NO"]),
  amount: z.number().min(1).max(100000),
});

const userRateLimit = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const history = userRateLimit.get(userId) ?? [];
  const recent = history.filter((timestamp) => timestamp > oneMinuteAgo);

  if (recent.length >= 10) {
    return false;
  }

  // TODO: replace this in-memory limiter with Redis in production.
  recent.push(now);
  userRateLimit.set(userId, recent);
  return true;
}

export async function POST(
  request: Request,
  { params }: Params,
): Promise<NextResponse<ApiSuccess<Bet> | ApiError>> {
  const { id: marketId } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED", status: 401 },
        { status: 401 },
      );
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMITED", status: 429 },
        { status: 429 },
      );
    }

    const payload = (await request.json()) as { side: BetSide; amount: number };
    const parsed = betSchema.safeParse(payload);

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

    const { data: market, error: marketError } = await supabase
      .from("markets")
      .select("id,status,expires_at,yes_volume,no_volume")
      .eq("id", marketId)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: "Market not found", code: "MARKET_NOT_FOUND", status: 404 },
        { status: 404 },
      );
    }

    if (market.status !== "OPEN") {
      return NextResponse.json(
        { error: "Market is not open", code: "MARKET_CLOSED", status: 400 },
        { status: 400 },
      );
    }

    if (new Date(market.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Market expired", code: "MARKET_EXPIRED", status: 400 },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND", status: 404 },
        { status: 404 },
      );
    }

    if (Number(profile.wallet_balance) < parsed.data.amount) {
      return NextResponse.json(
        {
          error: "Insufficient funds",
          code: "INSUFFICIENT_FUNDS",
          status: 400,
        },
        { status: 400 },
      );
    }

    const yesVolume = Number(market.yes_volume ?? 0);
    const noVolume = Number(market.no_volume ?? 0);
    const probability = calculateProbability(yesVolume, noVolume);

    const effectiveProbability = parsed.data.side === "YES" ? probability : 1 - probability;
    const shares = parsed.data.amount / Math.max(effectiveProbability, 0.01);
    const payout = calculatePotentialPayout(parsed.data.amount, probability, parsed.data.side);

    const { data: insertedBet, error: betError } = await supabase
      .from("bets")
      .insert({
        user_id: user.id,
        market_id: marketId,
        side: parsed.data.side,
        amount: parsed.data.amount,
        shares,
        potential_payout: payout,
      })
      .select("id,user_id,market_id,side,amount,shares,potential_payout,status,created_at")
      .single();

    if (betError || !insertedBet) {
      if ((betError as { code?: string } | null)?.code === "P0001") {
        return NextResponse.json(
          {
            error: "Insufficient funds",
            code: "INSUFFICIENT_FUNDS",
            status: 400,
          },
          { status: 400 },
        );
      }

      if ((betError as { code?: string } | null)?.code === "23505") {
        return NextResponse.json(
          {
            error: "Duplicate bet",
            code: "DUPLICATE_BET",
            status: 409,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to place bet",
          code: "BET_INSERT_FAILED",
          status: 500,
        },
        { status: 500 },
      );
    }

    const volumeColumn = parsed.data.side === "YES" ? "yes_volume" : "no_volume";
    const nextVolume =
      parsed.data.side === "YES"
        ? yesVolume + parsed.data.amount
        : noVolume + parsed.data.amount;

    const { error: volumeError } = await supabase
      .from("markets")
      .update({ [volumeColumn]: nextVolume })
      .eq("id", marketId);

    if (volumeError) {
      return NextResponse.json(
        {
          error: "Bet placed but market update failed",
          code: "MARKET_VOLUME_UPDATE_FAILED",
          status: 500,
        },
        { status: 500 },
      );
    }

    const result: Bet = {
      id: insertedBet.id,
      user_id: insertedBet.user_id,
      market_id: insertedBet.market_id,
      side: insertedBet.side as BetSide,
      amount: Number(insertedBet.amount),
      shares: Number(insertedBet.shares),
      potential_payout: Number(insertedBet.potential_payout),
      status: insertedBet.status as Bet["status"],
      created_at: insertedBet.created_at,
    };

    return NextResponse.json({ data: result, message: "Bet placed" }, { status: 201 });
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
