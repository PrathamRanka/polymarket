"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchRecentBets } from "@/lib/api/fetchers";
import { formatCoins } from "@/lib/utils";
import type { UserRank } from "@/types";

interface RecentBetsProps {
  marketId: string;
}

interface BetWithUser {
  id: string;
  side: "YES" | "NO";
  amount: number;
  created_at: string;
  user: {
    username: string;
    rank: UserRank;
  } | null;
}

export default function RecentBets({ marketId }: RecentBetsProps) {
  const { data: bets = [], isLoading, isError } = useQuery<BetWithUser[], Error>({
    queryKey: ["market-recent-bets", marketId],
    queryFn: () => fetchRecentBets(marketId),
    enabled: Boolean(marketId),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  if (isLoading) {
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

  if (isError) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Recent Bets</h3>
        <p className="text-sm text-rose-400">Unable to load recent bets right now.</p>
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
                    {bet.user?.username ?? "Unknown"}
                  </span>
                  {bet.user?.rank ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      {bet.user.rank}
                    </span>
                  ) : null}
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
