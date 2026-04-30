"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import getSupabaseBrowserClient from "@/lib/supabase/client";
import type { Market } from "@/types";

export function useRealtimeOdds(marketId: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!marketId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`market:${marketId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "markets",
          filter: `id=eq.${marketId}`,
        },
        (payload: { new: Partial<Market> }) => {
          const current = queryClient.getQueryData<Market>(["market", marketId]);
          if (!current) {
            return;
          }

          const next = payload.new as Partial<Market>;
          queryClient.setQueryData<Market>(["market", marketId], {
            ...current,
            ...next,
            yes_probability: typeof next.yes_probability === "number" ? next.yes_probability : current.yes_probability,
          });
        },
      )
      .subscribe((status: string) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [marketId, queryClient]);

  const market = queryClient.getQueryData<Market>(["market", marketId]);
  const yesProb = market?.yes_probability ?? 0.5;
  const noProb = useMemo(() => 1 - yesProb, [yesProb]);

  return { yesProb, noProb, isConnected };
}

export default useRealtimeOdds;
