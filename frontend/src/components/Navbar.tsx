"use client";
import React from "react";
import Link from "next/link";
import ConnectWallet from "./ConnectWallet";
import { motion } from "framer-motion";

const Navbar = () => {
    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/30 border-b border-white/10"
        >
            <div className="flex items-center gap-2">
                <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-purple-500">
                    PIFP
                </Link>
            </div>
            <div>
                <ConnectWallet />
            </div>
        </motion.nav>
    );
};

export default Navbar;
