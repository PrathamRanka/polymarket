"use client";

import { motion } from "framer-motion";
import { Coins, Timer } from "lucide-react";

import { formatCoins, formatProbability, formatTimeLeft } from "@/lib/utils";
import type { Market } from "@/types";

interface MarketCardProps {
  market: Market;
  onClick?: () => void;
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const yesPercent = Math.round(market.yes_probability * 100);
  const noPercent = 100 - yesPercent;
  const volume = market.yes_volume + market.no_volume;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur"
      style={{ boxShadow: "0 0 0 rgba(59,130,246,0)" }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={`Market ${market.title}`}
    >
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
        <span>{market.category.icon}</span>
        <span>{market.category.name}</span>
      </div>

      <h3 className="line-clamp-2 text-base font-semibold text-white">{market.title}</h3>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-emerald-400">YES {formatProbability(market.yes_probability)}</span>
          <span className="text-rose-400">NO {noPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            layout
            animate={{ width: `${yesPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-emerald-500"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <div className="inline-flex items-center gap-1">
          <Coins className="size-3.5" />
          <span>{formatCoins(volume)}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <span>Liquidity {formatCoins(volume * 1.6)}</span>
        </div>
        <div className="inline-flex items-center gap-1">
          <Timer className="size-3.5" />
          <span>{formatTimeLeft(market.expires_at)}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default MarketCard;
