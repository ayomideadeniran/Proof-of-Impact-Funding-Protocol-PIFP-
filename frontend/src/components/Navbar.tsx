"use client";
import React from "react";
import Link from "next/link";
import ConnectWallet from "./ConnectWallet";
import { motion } from "framer-motion";
import { Compass, FlaskConical, Layers3 } from "lucide-react";

const Navbar = () => {
    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed left-1/2 top-2 z-50 w-[min(1200px,calc(100%-0.75rem))] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/45 px-3 py-2.5 shadow-2xl backdrop-blur-2xl sm:top-3 sm:w-[min(1200px,calc(100%-1.25rem))] sm:px-4 sm:py-3"
        >
            <div className="flex items-center justify-between gap-2 sm:gap-4">
                <Link href="/" className="inline-flex items-center gap-2 sm:gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/20 bg-gradient-to-br from-cyan-300/30 to-emerald-300/20 sm:h-9 sm:w-9">
                        <Layers3 className="h-4 w-4 text-cyan-100 sm:h-4 sm:w-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-semibold tracking-wide text-white sm:text-sm">PIFP</p>
                        <p className="hidden text-[11px] text-white/60 sm:block">Proof-of-Impact Protocol</p>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-2">
                    <Link
                        href="#projects"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <Compass className="h-3.5 w-3.5" />
                        Projects
                    </Link>
                    <Link
                        href="#create"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <FlaskConical className="h-3.5 w-3.5" />
                        Create
                    </Link>
                </div>

                <div className="min-w-0">
                    <ConnectWallet />
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
