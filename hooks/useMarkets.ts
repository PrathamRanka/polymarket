"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createMarket, fetchMarket, fetchMarkets } from "@/lib/api/fetchers";
import type { CreateMarketFormValues, Market, MarketStatus } from "@/types";

export function useMarkets(filters?: { category?: string; status?: MarketStatus }) {
  const router = useRouter();

  const query = useQuery<Market[], Error>({
    queryKey: ["markets", filters],
    queryFn: () => fetchMarkets(filters),
    staleTime: 30000,
  });

  if (query.error?.message === "Unauthorized") {
    router.push("/login");
  }

  return {
    markets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useMarket(id: string) {
  const router = useRouter();

  const query = useQuery<Market, Error>({
    queryKey: ["market", id],
    queryFn: () => fetchMarket(id),
    staleTime: 15000,
    enabled: Boolean(id),
  });

  if (query.error?.message === "Unauthorized") {
    router.push("/login");
  }

  return query;
}

export function useCreateMarket() {
  const queryClient = useQueryClient();

  return useMutation<Market, Error, CreateMarketFormValues>({
    mutationFn: createMarket,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markets"] });
      toast.success("Market created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create market");
    },
  });
}
