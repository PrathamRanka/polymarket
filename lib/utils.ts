import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

import type { BetSide, MarketStatus, UserRank } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCoins(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B coins`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M coins`;
  }
  if (abs >= 1_000) {
    return `${Math.round(amount).toLocaleString()} coins`;
  }
  return `${Math.round(amount)} coins`;
}

export function formatProbability(prob: number): string {
  const safe = Math.max(0, Math.min(1, prob));
  return `${Math.round(safe * 100)}%`;
}

export function formatTimeLeft(expiresAt: string): string {
  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  if (target <= now) {
    return "Expired";
  }

  const ms = target.getTime() - now.getTime();
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return formatDistanceToNowStrict(target, { addSuffix: false });
}

export function calculateProbability(yesVol: number, noVol: number): number {
  if (yesVol === 0 && noVol === 0) {
    return 0.5;
  }

  const ratio = yesVol / (yesVol + noVol);
  return Math.max(0.01, Math.min(0.99, ratio));
}

export function calculatePotentialPayout(
  amount: number,
  probability: number,
  side: BetSide,
): number {
  if (side === "YES") {
    return amount / Math.max(probability, 0.01);
  }

  return amount / Math.max(1 - probability, 0.01);
}

export function getRankColor(rank: UserRank): string {
  switch (rank) {
    case "Novice":
      return "text-zinc-400";
    case "Analyst":
      return "text-blue-400";
    case "Expert":
      return "text-violet-400";
    case "Oracle":
      return "text-amber-400";
    case "Legend":
      return "text-rose-400";
    default:
      return "text-zinc-300";
  }
}

export function getMarketStatusColor(status: MarketStatus): string {
  switch (status) {
    case "OPEN":
      return "text-emerald-400 bg-emerald-400/10";
    case "CLOSED":
      return "text-amber-400 bg-amber-400/10";
    case "RESOLVED":
      return "text-sky-400 bg-sky-400/10";
    case "CANCELLED":
      return "text-zinc-400 bg-zinc-400/10";
    default:
      return "text-zinc-300 bg-zinc-300/10";
  }
}

const utils = {
  cn,
  formatCoins,
  formatProbability,
  formatTimeLeft,
  calculateProbability,
  calculatePotentialPayout,
  getRankColor,
  getMarketStatusColor,
};

export default utils;
