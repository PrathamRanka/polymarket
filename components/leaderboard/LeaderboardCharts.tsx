"use client";

import { useMarketHeatmap, useCalibrationData } from "@/hooks/useCharts";
import MarketHeatmap from "@/components/leaderboard/MarketHeatmap";
import CalibrationChart from "@/components/leaderboard/CalibrationChart";

export function LeaderboardCharts() {
  const { data: heatmapData, loading: heatmapLoading } = useMarketHeatmap();
  const { data: calibrationData, loading: calibrationLoading } = useCalibrationData();

  return (
    <div className="space-y-4">
      {!heatmapLoading && heatmapData.length > 0 && <MarketHeatmap data={heatmapData} />}
      {!calibrationLoading && calibrationData.length > 0 && <CalibrationChart data={calibrationData} />}
      {heatmapLoading && calibrationLoading && <div className="text-zinc-400">Loading leaderboard charts...</div>}
    </div>
  );
}
