import type {
  Bet,
  BetFormValues,
  CreateMarketFormValues,
  LeaderboardEntry,
  Market,
  MarketStatus,
  Portfolio,
} from "@/types";

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const payload = (await response.json()) as ApiEnvelope<T> | { error: string };

  if (!response.ok || !("data" in payload)) {
    const message = "error" in payload ? payload.error : "Request failed";
    throw new Error(message);
  }

  return payload.data;
}

export async function fetchMarkets(filters?: {
  category?: string;
  status?: MarketStatus;
}): Promise<Market[]> {
  const params = new URLSearchParams();
  if (filters?.category) {
    params.set("category", filters.category);
  }
  if (filters?.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();
  const response = await fetch(`/api/markets${query ? `?${query}` : ""}`);
  return parseResponse<Market[]>(response);
}

export async function fetchMarket(id: string): Promise<Market> {
  const response = await fetch(`/api/markets/${id}`);
  return parseResponse<Market>(response);
}

export async function createMarket(payload: CreateMarketFormValues): Promise<Market> {
  const response = await fetch("/api/markets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<Market>(response);
}

export async function placeBet(
  marketId: string,
  payload: BetFormValues,
): Promise<Bet> {
  const response = await fetch(`/api/markets/${marketId}/bet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<Bet>(response);
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const response = await fetch(`/api/leaderboard?limit=${limit}`);
  return parseResponse<LeaderboardEntry[]>(response);
}

export async function fetchPortfolio(): Promise<Portfolio> {
  const response = await fetch("/api/portfolio");
  return parseResponse<Portfolio>(response);
}
