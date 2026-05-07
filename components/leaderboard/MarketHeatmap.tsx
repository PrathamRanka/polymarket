"use client";

import { useMemo } from "react";

interface HeatmapDataPoint {
  category: string;
  day_of_week: number;
  volume: number;
  market_count: number;
}

interface MarketHeatmapProps {
  data: HeatmapDataPoint[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES = [
  "Sports",
  "Politics",
  "Finance",
  "Weather",
  "Entertainment",
  "Science",
  "Technology",
  "Other",
];

const getColor = (value: number, max: number) => {
  const ratio = value / (max || 1);
  if (ratio < 0.2) return "#0f172a";
  if (ratio < 0.4) return "#1e3a8a";
  if (ratio < 0.6) return "#3b82f6";
  if (ratio < 0.8) return "#60a5fa";
  return "#93c5fd";
};

export function MarketHeatmap({ data }: MarketHeatmapProps) {
  const heatmapData = useMemo(() => {
    const maxVolume = Math.max(...data.map((d) => d.volume || 0), 1);

    const grid = Array(7)
      .fill(null)
      .map((_, dayIdx) =>
        Array(8)
          .fill(null)
          .map((_, catIdx) => {
            const item = data.find((d) => d.day_of_week === dayIdx && CATEGORIES[catIdx] === d.category);
            return {
              x: dayIdx,
              y: catIdx,
              day: DAYS[dayIdx],
              category: CATEGORIES[catIdx],
              volume: item?.volume || 0,
              markets: item?.market_count || 0,
              maxVolume,
            };
          })
      );

    return grid.flat();
  }, [data]);

  const maxVolume = Math.max(...heatmapData.map((d) => d.volume || 0), 1);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-zinc-100">Market Activity Heatmap</h3>

      <div className="overflow-x-auto">
        <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {heatmapData.map((item) => (
            <div
              key={`${item.day}-${item.category}`}
              className="rounded-lg border border-zinc-700 p-3"
              style={{ backgroundColor: getColor(item.volume, maxVolume) }}
            >
              <div className="text-xs font-semibold text-zinc-200">
                {item.day} - {item.category}
              </div>
              <div className="mt-1 text-sm font-bold text-zinc-100">${item.volume.toFixed(0)}</div>
              <div className="text-xs text-zinc-400">{item.markets} markets</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="text-zinc-400">Activity:</span>
        <div className="flex gap-1">
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => (
            <div
              key={ratio}
              className="h-4 w-4 rounded-sm"
              style={{ backgroundColor: getColor(ratio * maxVolume, maxVolume) }}
            />
          ))}
        </div>
        <span className="text-zinc-500">Low → High</span>
      </div>
    </div>
  );
}

export default MarketHeatmap;
