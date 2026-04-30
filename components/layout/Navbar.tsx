"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import WalletBadge from "@/components/wallet/WalletBadge";

const navLinks = [
  { href: "/markets", label: "Markets" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = useMemo(() => navLinks, []);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-zinc-100">
          <span className="rounded-full bg-amber-400/20 px-2 py-1 text-amber-300">◉</span>
          <span className="font-semibold tracking-wide">PredictMarket</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "border-b-2 border-transparent pb-1 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100",
                  active && "border-blue-500 text-zinc-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <WalletBadge />
          <Link href="/signup" className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-400">
            Sign Up
          </Link>
          <Link href="/login" className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800">
            Login
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="inline-flex items-center justify-center rounded-md border border-zinc-700 p-2 text-zinc-100 md:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-zinc-800 bg-zinc-900 md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2 text-zinc-200 hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <WalletBadge />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
