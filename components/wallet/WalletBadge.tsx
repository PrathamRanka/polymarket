"use client";

import { Coins } from "lucide-react";

import { formatCoins } from "@/lib/utils";
import { useWallet } from "@/stores/walletStore";

export function WalletBadge() {
  const { balance, hydrated } = useWallet();

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-300">
      <Coins className="size-4" />
      <span>{hydrated ? formatCoins(balance) : "Loading wallet"}</span>
    </div>
  );
}

export default WalletBadge;
