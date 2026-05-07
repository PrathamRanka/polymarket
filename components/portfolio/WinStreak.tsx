"use client";

import { useMemo } from "react";
import type { Bet } from "@/types";

interface WinStreakProps {
  bets: Bet[];
}

export function WinStreak({ bets }: WinStreakProps) {
  const streakData = useMemo(() => {
    if (!bets || bets.length === 0) {
      return { current: 0, best: 0, losses: 0, recentBets: [] };
    }

    const sorted = [...bets].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let current = 0;
    let best = 0;
    let tempStreak = 0;
    let losses = 0;

    sorted.forEach((bet) => {
      if (bet.status === "WON") {
        tempStreak += 1;
        current = Math.max(current, tempStreak);
        best = Math.max(best, tempStreak);
      } else {
        tempStreak = 0;
        if (bet.status === "LOST") {
          losses += 1;
        }
      }
    });

    return {
      current,
      best,
      losses,
      recentBets: sorted.slice(0, 10),
    };
  }, [bets]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-zinc-100">Win Streak</h3>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="text-xs text-zinc-400">Current Streak</div>
          <div className="text-2xl font-bold text-blue-400">{streakData.current}</div>
          <div className="text-xs text-zinc-500">consecutive wins</div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="text-xs text-zinc-400">Best Streak</div>
          <div className="text-2xl font-bold text-green-400">{streakData.best}</div>
          <div className="text-xs text-zinc-500">all time</div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="text-xs text-zinc-400">Total Losses</div>
          <div className="text-2xl font-bold text-red-400">{streakData.losses}</div>
          <div className="text-xs text-zinc-500">bets lost</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-300">Recent Results</h4>
        <div className="flex gap-1">
          {streakData.recentBets.map((bet) => (
            <div
              key={bet.id}
              className={`h-8 w-8 rounded-md border ${
                bet.status === "WON"
                  ? "border-green-600 bg-green-900/40"
                  : bet.status === "LOST"
                    ? "border-red-600 bg-red-900/40"
                    : "border-gray-600 bg-gray-900/40"
              } flex items-center justify-center text-xs font-semibold`}
              title={`${bet.status} - ${new Date(bet.created_at).toLocaleDateString()}`}
            >
              {bet.status === "WON" ? "✓" : bet.status === "LOST" ? "✕" : "↻"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WinStreak;
