"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { placeBet } from "@/lib/api/fetchers";
import { calculatePotentialPayout, calculateProbability } from "@/lib/utils";
import { useWalletStore } from "@/stores/walletStore";
import type { Bet, BetFormValues, Market } from "@/types";

export function useBet(marketId: string) {
  const queryClient = useQueryClient();
  const deduct = useWalletStore((state) => state.deduct);

  const mutation = useMutation<Bet, Error, BetFormValues, { previousMarket?: Market }>({
    mutationFn: (payload) => placeBet(marketId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["market", marketId] });
      const previousMarket = queryClient.getQueryData<Market>(["market", marketId]);

      if (previousMarket) {
        const optimisticYesVolume =
          payload.side === "YES"
            ? previousMarket.yes_volume + payload.amount
            : previousMarket.yes_volume;
        const optimisticNoVolume =
          payload.side === "NO"
            ? previousMarket.no_volume + payload.amount
            : previousMarket.no_volume;
        const nextProb = calculateProbability(optimisticYesVolume, optimisticNoVolume);

        queryClient.setQueryData<Market>(["market", marketId], {
          ...previousMarket,
          yes_volume: optimisticYesVolume,
          no_volume: optimisticNoVolume,
          yes_probability: nextProb,
        });
      }

      return { previousMarket };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMarket) {
        queryClient.setQueryData<Market>(["market", marketId], context.previousMarket);
      }
      toast.error(error.message || "Unable to place bet");
    },
    onSuccess: async (bet) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["market", marketId] }),
        queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      ]);

      deduct(bet.amount);
      const payout = calculatePotentialPayout(bet.amount, 0.5, bet.side);
      toast.success(`Bet placed. Potential payout: ${Math.round(payout).toLocaleString()} coins`);
    },
  });

  return {
    placeBet: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
