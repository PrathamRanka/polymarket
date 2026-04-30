"use client";

import { produce } from "immer";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { WalletStore } from "@/types";

interface WalletState extends WalletStore {
  hydrated: boolean;
  isInsufficient: (amount: number) => boolean;
  setHydrated: (value: boolean) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 1000,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setBalance: (balance) =>
        set(
          produce<WalletState>((draft) => {
            draft.balance = Math.max(0, balance);
          }),
        ),
      deduct: (amount) =>
        set(
          produce<WalletState>((draft) => {
            draft.balance = Math.max(0, draft.balance - amount);
          }),
        ),
      add: (amount) =>
        set(
          produce<WalletState>((draft) => {
            draft.balance += amount;
          }),
        ),
      isInsufficient: (amount) => amount > get().balance,
    }),
    {
      name: "predictmarket-wallet",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function useWallet(): WalletState {
  return useWalletStore();
}
