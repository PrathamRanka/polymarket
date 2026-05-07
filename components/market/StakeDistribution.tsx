"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Outcome {
  id: string;
  label: string;
  stake: number;
}

interface StakeDistributionProps {
  outcomes: Outcome[];
}

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

export function StakeDistribution({ outcomes }: StakeDistributionProps) {
  const data = useMemo(() => {
    const total = outcomes.reduce((sum, o) => sum + o.stake, 0);
    return outcomes.map((o) => ({
      name: o.label,
      value: total > 0 ? Number(((o.stake / total) * 100).toFixed(2)) : 0,
      stake: o.stake,
    }));
  }, [outcomes]);

  const total = outcomes.reduce((sum, o) => sum + o.stake, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-zinc-100">Stake Distribution</h3>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="h-60 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length] ?? "#8884d8"}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2">
          {data.map((item, idx) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-zinc-300">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-zinc-100">{item.value}%</div>
                <div className="text-xs text-zinc-500">${item.stake.toFixed(2)}</div>
              </div>
            </div>
          ))}
          <div className="border-t border-zinc-700 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Pool</span>
              <span className="font-semibold text-zinc-100">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StakeDistribution;
