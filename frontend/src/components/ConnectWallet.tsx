"use client";
import { useWallet } from "@/context/WalletContext";
import { motion } from "framer-motion";

export default function ConnectWallet() {
  const { address, connectWallet, disconnectWallet } = useWallet();

  return (
    <div className="flex items-center gap-4">
      {address ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/10"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-mono text-gray-200">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button
            onClick={disconnectWallet}
            className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </motion.div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={connectWallet}
          className="bg-gradient-to-r from-teal-500 to-purple-600 text-white font-bold py-2 px-6 rounded-full hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          Connect Starknet
        </motion.button>
      )}
    </div>
  );
}
