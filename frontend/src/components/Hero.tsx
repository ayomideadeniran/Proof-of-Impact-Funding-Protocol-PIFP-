"use client";
import React from "react";
import { motion } from "framer-motion";

const Hero = () => {
    return (
        <section className="relative flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black"
            />

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-purple-500 to-pink-500"
            >
                Proof-of-Impact <br /> Funding Protocol
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10"
            >
                A trust-minimized platform where funding is released only after impact is verified effectively.
                Built on Starknet for transparency and integrity.
            </motion.p>
        </section>
    );
};

export default Hero;
