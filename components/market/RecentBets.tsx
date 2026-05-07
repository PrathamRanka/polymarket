"use client";

import { useEffect, useState } from "react";
import getSupabaseBrowserClient from "@/lib/supabase/client";
import { formatCoins } from "@/lib/utils";
import type { Bet } from "@/types";

interface RecentBetsProps {
  marketId: string;
}

interface BetWithUser extends Bet {
  user?: {
    username: string;
    rank?: string;
  };
}

export default function RecentBets({ marketId }: RecentBetsProps) {
  const [bets, setBets] = useState<BetWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  // Fetch initial bets
  useEffect(() => {
    const fetchBets = async () => {
      try {
        const { data } = await supabase
          .from("bets")
          .select("*,users(username,rank)")
          .eq("market_id", marketId)
          .order("created_at", { ascending: false })
          .limit(10);

        setBets((data as BetWithUser[]) || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching bets:", err);
        setLoading(false);
      }
    };

    fetchBets();
  }, [marketId, supabase]);

  // Subscribe to new bets
  useEffect(() => {
    const subscription = supabase
      .channel(`bets:${marketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bets",
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          const newBet = payload.new as BetWithUser;
          setBets((prev) => [newBet, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [marketId, supabase]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Recent Bets</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">Recent Bets</h3>
      {bets.length === 0 ? (
        <p className="text-sm text-zinc-400">No bets yet. Be the first to bet!</p>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950/40 p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-400">
                    {bet.user?.username || "Unknown"}
                  </span>
                  {bet.user?.rank && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      {bet.user.rank}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      bet.side === "YES"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {bet.side}
                  </span>
                  <span className="text-sm text-zinc-300">
                    {formatCoins(bet.amount)} coins
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">
                  {new Date(bet.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
