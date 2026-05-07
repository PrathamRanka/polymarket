"use client";

import { useEffect, useState } from "react";
import type { Bet } from "@/types";

interface Outcome {
  id: string;
  label: string;
  stake: number;
}

export function useMarketOutcomes(marketId: string) {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOutcomes = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/markets/${marketId}/outcomes`);
        if (!res.ok) throw new Error("Failed to fetch outcomes");
        const data = await res.json();
        setOutcomes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOutcomes();
  }, [marketId]);

  return { outcomes, loading, error };
}

interface LiquidityDataPoint {
  timestamp: string;
  total_stake: number;
}

export function useLiquidityHistory(marketId: string) {
  const [data, setData] = useState<LiquidityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiquidity = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/markets/${marketId}/liquidity`);
        if (!res.ok) throw new Error("Failed to fetch liquidity history");
        const data = await res.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLiquidity();
  }, [marketId]);

  return { data, loading, error };
}

interface PerformanceItem {
  market_title: string;
  pnl: number;
  amount_bet: number;
  status: "WON" | "LOST" | "REFUNDED";
}

export function usePortfolioPerformance() {
  const [performance, setPerformance] = useState<PerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/portfolio/performance");
        if (!res.ok) throw new Error("Failed to fetch performance");
        const data = await res.json();
        setPerformance(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  return { performance, loading, error };
}

export function useWinStreak() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/portfolio/streak");
        if (!res.ok) throw new Error("Failed to fetch streak");
        const data = await res.json();
        setBets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, []);

  return { bets, loading, error };
}

interface HeatmapDataPoint {
  category: string;
  day_of_week: number;
  volume: number;
  market_count: number;
}

export function useMarketHeatmap() {
  const [data, setData] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/markets/heatmap");
        if (!res.ok) throw new Error("Failed to fetch heatmap");
        const data = await res.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmap();
  }, []);

  return { data, loading, error };
}

interface CalibrationPoint {
  implied_prob: number;
  actual_outcome: number;
  market_count: number;
}

export function useCalibrationData() {
  const [data, setData] = useState<CalibrationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalibration = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/calibration");
        if (!res.ok) throw new Error("Failed to fetch calibration data");
        const data = await res.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCalibration();
  }, []);

  return { data, loading, error };
}
