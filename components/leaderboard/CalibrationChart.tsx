"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
} from "recharts";

interface CalibrationPoint {
  implied_prob: number;
  actual_outcome: number;
  market_count: number;
}

interface CalibrationChartProps {
  data: CalibrationPoint[];
}

// Explicit chart type
interface ChartPoint {
  x: number;
  y: number;
  z: number;
  markets: number;
}

export function CalibrationChart({ data }: CalibrationChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data || data.length === 0) {
      return [
        {
          x: 0,
          y: 0,
          z: 50,
          markets: 0,
        },
      ];
    }

    return data.map((item) => ({
      x: item.implied_prob * 100,
      y: item.actual_outcome * 100,
      z: Math.max(item.market_count * 2, 50),
      markets: item.market_count,
    }));
  }, [data]);

  const avgDeviation = useMemo(() => {
    if (chartData.length === 0) return 0;

    return (
      chartData.reduce(
        (sum, point) => sum + Math.abs(point.x - point.y),
        0
      ) / chartData.length
    );
  }, [chartData]);

  const totalMarketsResolved = useMemo(() => {
    return chartData.reduce((sum, point) => sum + point.markets, 0);
  }, [chartData]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Calibration Analysis
          </h3>
          <p className="text-xs text-zinc-500">
            Implied vs actual probability (diagonal = perfect calibration)
          </p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-right">
          <div className="text-xs text-zinc-400">Avg Deviation</div>
          <div
            className={`text-lg font-semibold ${
              avgDeviation < 10
                ? "text-green-400"
                : avgDeviation < 20
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {avgDeviation.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid
              stroke="#3f3f46"
              strokeDasharray="3 3"
            />

            <XAxis
              type="number"
              dataKey="x"
              name="Implied Probability"
              domain={[0, 100]}
              stroke="#a1a1aa"
              label={{
                value: "Implied Probability (%)",
                position: "insideBottom",
                offset: -5,
              }}
            />

            <YAxis
              type="number"
              dataKey="y"
              name="Actual Outcome"
              domain={[0, 100]}
              stroke="#a1a1aa"
              label={{
                value: "Actual Outcome (%)",
                angle: -90,
                position: "insideLeft",
              }}
            />

            {/* Bubble size */}
            <ZAxis
              type="number"
              dataKey="z"
              range={[60, 400]}
            />

            {/* Perfect calibration diagonal */}
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ]}
              stroke="#71717a"
              strokeDasharray="5 5"
              ifOverflow="extendDomain"
            />
<Tooltip
  cursor={{ strokeDasharray: "3 3" }}
  contentStyle={{
    background: "#09090b",
    border: "1px solid #3f3f46",
    color: "#fafafa",
    borderRadius: "8px",
  }}
  formatter={(value, name) => {
    if (typeof value !== "number") {
      return [String(value ?? ""), String(name)];
    }

    if (name === "x") {
      return [`${value.toFixed(1)}%`, "Implied"];
    }

    if (name === "y") {
      return [`${value.toFixed(1)}%`, "Actual"];
    }

    if (name === "markets") {
      return [`${value}`, "Markets"];
    }

    return [value, String(name)];
  }}
/>

            <Scatter
              name="Markets"
              data={chartData}
              fill="#3b82f6"
              fillOpacity={0.65}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-2">
          <div className="text-zinc-400">
            Total Markets Resolved
          </div>
          <div className="font-semibold text-zinc-100">
            {totalMarketsResolved}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-2">
          <div className="text-zinc-400">Data Points</div>
          <div className="font-semibold text-zinc-100">
            {chartData.length}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 text-xs text-zinc-400">
        <p>
          💡 <strong>Perfect calibration:</strong> Points near the diagonal
          indicate prediction markets priced probabilities accurately.
        </p>
      </div>
    </div>
  );
}

export default CalibrationChart;