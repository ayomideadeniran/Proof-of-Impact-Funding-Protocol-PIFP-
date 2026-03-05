"use client";
import React from "react";
import { motion } from "framer-motion";

const Hero = () => {
    return (
        <section className="relative mx-auto flex min-h-[52vh] w-full max-w-7xl flex-col items-center justify-center px-4 pb-10 text-center sm:min-h-[58vh] sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"
            />

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="mb-5 bg-gradient-to-r from-teal-300 via-cyan-300 to-fuchsia-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:mb-6 sm:text-5xl lg:text-7xl"
            >
                Proof-of-Impact <br /> Funding Protocol
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mb-8 max-w-3xl px-2 text-base leading-relaxed text-gray-300 sm:text-lg md:text-xl"
            >
                A trust-minimized platform where funding is released only after impact is verified effectively.
                Built on Starknet for transparency and integrity.
            </motion.p>
        </section>
    );
};

export default Hero;
