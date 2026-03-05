"use client";
import React from "react";
import Link from "next/link";
import ConnectWallet from "./ConnectWallet";
import { motion } from "framer-motion";
import { Bell, Compass, FlaskConical, Layers3 } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import { useWallet } from "@/context/WalletContext";

const Navbar = () => {
    const { address } = useWallet();
    const { unreadCount, toggleHistory } = useNotification();

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed left-1/2 top-4 z-50 w-[min(1200px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/5 bg-zinc-900/60 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:top-6 sm:px-6 sm:py-4"
        >
            <div className="flex items-center justify-between gap-4">
                <Link href="/" className="inline-flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 shadow-inner">
                        <Layers3 className="h-5 w-5 text-emerald-400" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold tracking-wide text-white">PIFP</p>
                        <p className="hidden text-xs text-zinc-400 sm:block font-medium">Proof-of-Impact Protocol</p>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-2">
                    <Link
                        href="#projects"
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-all"
                    >
                        <Compass className="h-4 w-4" />
                        Projects
                    </Link>
                    <Link
                        href="#create"
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-all"
                    >
                        <FlaskConical className="h-4 w-4" />
                        Create
                    </Link>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                    {address && (
                        <button
                            type="button"
                            onClick={toggleHistory}
                            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/70 text-zinc-200 transition-colors hover:bg-zinc-900 hover:text-white"
                            aria-label="Open notifications"
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-400 px-1 text-center text-[10px] font-bold text-slate-950">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>
                    )}
                    <div className="min-w-0">
                        <ConnectWallet />
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
// Finalizing commit 27: navbar navigation logic
