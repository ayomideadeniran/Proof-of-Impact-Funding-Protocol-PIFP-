"use client";
import React from "react";
import { motion } from "framer-motion";

const Hero = () => {
    return (
        <section className="relative mx-auto flex min-h-[52vh] w-full max-w-7xl flex-col items-center justify-center px-4 pb-10 text-center sm:min-h-[58vh] sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950/0 to-transparent"
            />

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
                Proof-of-Impact <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Funding Protocol
                </span>
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                className="mb-8 max-w-2xl px-2 text-base leading-relaxed text-zinc-400 sm:text-lg md:text-xl"
            >
                A trust-minimized platform where funding is released only after real-world impact is cryptographically verified. Built on Starknet.
            </motion.p>
        </section>
    );
};

export default Hero;
