"use client";

import { useMarketOutcomes, useLiquidityHistory } from "@/hooks/useCharts";
import OutcomeComparison from "@/components/market/OutcomeComparison";
import StakeDistribution from "@/components/market/StakeDistribution";
import LiquidityTrend from "@/components/market/LiquidityTrend";

interface MarketChartsProps {
  marketId: string;
}

export function MarketCharts({ marketId }: MarketChartsProps) {
  const { outcomes, loading: outcomesLoading } = useMarketOutcomes(marketId);
  const { data: liquidityData, loading: liquidityLoading } = useLiquidityHistory(marketId);

  const totalStake = outcomes.reduce((sum, o) => sum + o.stake, 0);

  return (
    <div className="space-y-4">
      {!outcomesLoading && outcomes.length > 0 && (
        <>
          <OutcomeComparison outcomes={outcomes} totalStake={totalStake} />
          <StakeDistribution outcomes={outcomes} />
        </>
      )}

      {!liquidityLoading && liquidityData.length > 0 && <LiquidityTrend data={liquidityData} />}

      {outcomesLoading && <div className="text-zinc-400">Loading charts...</div>}
    </div>
  );
}
