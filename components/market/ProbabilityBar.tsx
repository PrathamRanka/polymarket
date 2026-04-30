import { cn } from "@/lib/utils";

export interface ProbabilityBarProps {
  yesProbability: number;
  className?: string;
}

export function ProbabilityBar({ yesProbability, className }: ProbabilityBarProps) {
  const safeProbability = Math.max(0, Math.min(1, yesProbability));
  const yesPercent = Math.round(safeProbability * 100);
  const noPercent = 100 - yesPercent;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-emerald-400">YES {yesPercent}%</span>
        <span className="text-rose-400">NO {noPercent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${yesPercent}%` }}
        />
      </div>
    </div>
  );
}

export default ProbabilityBar;