"use client";

import { usePortfolioPerformance, useWinStreak } from "@/hooks/useCharts";
import PerformanceBreakdown from "@/components/portfolio/PerformanceBreakdown";
import WinStreak from "@/components/portfolio/WinStreak";

export function PortfolioCharts() {
  const { performance, loading: perfLoading } = usePortfolioPerformance();
  const { bets, loading: streakLoading } = useWinStreak();

  return (
    <div className="space-y-4">
      {!streakLoading && <WinStreak bets={bets} />}
      {!perfLoading && performance.length > 0 && <PerformanceBreakdown performance={performance} />}
      {perfLoading && streakLoading && <div className="text-zinc-400">Loading portfolio charts...</div>}
    </div>
  );
}
