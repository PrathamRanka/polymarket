"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchPortfolio } from "@/lib/api/fetchers";
import type { Portfolio } from "@/types";

export function usePortfolio() {
  const router = useRouter();

  const query = useQuery<Portfolio, Error>({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
    staleTime: 15000,
  });

  if (query.error?.message === "Unauthorized") {
    router.push("/login");
  }

  return {
    portfolio: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export default usePortfolio;