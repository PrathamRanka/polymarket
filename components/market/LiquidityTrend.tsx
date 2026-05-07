"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

interface LiquidityDataPoint {
  timestamp: string;
  total_stake: number;
}

interface LiquidityTrendProps {
  data: LiquidityDataPoint[];
}

export function LiquidityTrend({ data }: LiquidityTrendProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ date: "No data", stake: 0 }];
    }

    return data.map((item) => ({
      date: new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit" }),
      stake: item.total_stake,
    }));
  }, [data]);

  const maxLiquidity = Math.max(...chartData.map((d) => d.stake || 0), 1);
  const avgLiquidity = chartData.reduce((sum, d) => sum + (d.stake || 0), 0) / chartData.length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Liquidity Trend</h3>
          <p className="text-xs text-zinc-500">Total stake over time</p>
        </div>
        <div className="flex gap-4 text-right text-xs">
          <div>
            <div className="text-zinc-400">Max Liquidity</div>
            <div className="font-semibold text-green-400">${maxLiquidity.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-zinc-400">Avg Liquidity</div>
            <div className="font-semibold text-blue-400">${avgLiquidity.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="liquidity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
            <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#09090b",
                borderColor: "#3f3f46",
                color: "#fafafa",
              }}
              formatter={(value) => `$${Number(value).toFixed(2)}`}
            />
            <Area
              type="monotone"
              dataKey="stake"
              stroke="#3b82f6"
              fill="url(#liquidity)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LiquidityTrend;
