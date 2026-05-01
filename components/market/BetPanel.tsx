"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { useBet } from "@/hooks/useBet";
import { calculatePotentialPayout, formatCoins } from "@/lib/utils";
import { useWallet } from "@/stores/walletStore";
import type { BetFormValues, BetSide, Market } from "@/types";

const presets = [10, 50, 100, 500] as const;

const formSchema = z.object({
  amount: z.number().int().positive(),
});

interface BetPanelProps {
  market: Market;
}

export function BetPanel({ market }: BetPanelProps) {
  const [side, setSide] = useState<BetSide>("YES");
  const [showSuccess, setShowSuccess] = useState(false);
  const { balance } = useWallet();
  const { placeBet, isPending, error } = useBet(market.id);

  const form = useForm<{ amount: number }>({
    defaultValues: { amount: 10 },
    resolver: zodResolver(formSchema),
  });

  const amount = useWatch({ control: form.control, name: "amount" }) ?? 0;

  const potentialPayout = useMemo(
    () => calculatePotentialPayout(amount, market.yes_probability, side),
    [amount, market.yes_probability, side],
  );

  const profitPct = useMemo(() => {
    if (amount <= 0) return 0;
    return ((potentialPayout - amount) / amount) * 100;
  }, [amount, potentialPayout]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: BetFormValues = {
      side,
      amount: values.amount,
    };

    try {
      await placeBet(payload);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch {
      toast.error("Could not place bet");
    }
  });

  const disabled = market.status !== "OPEN" || amount > balance || isPending;

  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 lg:sticky lg:top-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-semibold ${side === "YES" ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-200"}`}
          onClick={() => setSide("YES")}
        >
          Buy YES
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-semibold ${side === "NO" ? "bg-rose-500 text-zinc-950" : "bg-zinc-800 text-zinc-200"}`}
          onClick={() => setSide("NO")}
        >
          Buy NO
        </button>
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm text-zinc-300" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            min={1}
            max={Math.floor(balance)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            {...form.register("amount", { valueAsNumber: true })}
          />
          {form.formState.errors.amount ? (
            <p className="mt-1 text-sm text-rose-400">{form.formState.errors.amount.message}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((value) => (
            <button
              key={value}
              type="button"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => form.setValue("amount", value)}
            >
              {value}
            </button>
          ))}
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
            onClick={() => form.setValue("amount", Math.floor(balance))}
          >
            MAX
          </button>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300">
          <p className="font-medium text-zinc-100">Potential Payout: {formatCoins(potentialPayout)}</p>
          <p className="text-zinc-400">+{Math.round(profitPct)}%</p>
          <p className="mt-1 text-zinc-400">Wallet: {formatCoins(balance)}</p>
        </div>

        {amount > balance ? <p className="text-sm text-rose-400">Insufficient funds.</p> : null}
        {error ? <p className="text-sm text-rose-400">{error.message}</p> : null}

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Place Bet
        </button>
      </form>

      {showSuccess ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300"
        >
          <CheckCircle2 className="size-4" />
          Bet placed successfully
        </motion.div>
      ) : null}
    </aside>
  );
}

export default BetPanel;
