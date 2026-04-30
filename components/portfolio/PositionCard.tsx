import { formatCoins, formatProbability } from "@/lib/utils";
import type { Bet, Market } from "@/types";

interface PositionCardProps {
  bet: Bet;
  market?: Market;
}

export function PositionCard({ bet, market }: PositionCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <h3 className="text-sm font-semibold text-zinc-100">{market?.title ?? bet.market_id}</h3>
      <p className="mt-1 text-xs text-zinc-400">
        {bet.side} · {formatCoins(bet.amount)} · {formatProbability(market?.yes_probability ?? 0.5)} YES
      </p>
    </article>
  );
}

export default PositionCard;
