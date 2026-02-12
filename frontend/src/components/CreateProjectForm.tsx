"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useWallet } from "@/context/WalletContext";
import { CallData, cairo } from "starknet";

// Replace with deployed contract address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function CreateProjectForm() {
    const { account } = useWallet();
    const [title, setTitle] = useState("");
    const [goal, setGoal] = useState("");
    const [recipient, setRecipient] = useState("");
    const [proofHash, setProofHash] = useState("");
    const [loading, setLoading] = useState(false);

    const generateHash = async () => {
        setLoading(true);
        // Simulate oracle call
        setTimeout(() => {
            setProofHash("0x" + Math.random().toString(16).substr(2, 64));
            setLoading(false);
        }, 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!account) {
            alert("Please connect your wallet first.");
            return;
        }

        try {
            const goalUint256 = cairo.uint256(BigInt(parseFloat(goal) * 1e18)); // Convert ETH to wei

            const call = {
                contractAddress: CONTRACT_ADDRESS,
                entrypoint: "create_project",
                calldata: CallData.compile({
                    title: title, // felt252 or ByteArray depending on contract. We used felt252 in contract
                    funding_goal: goalUint256,
                    recipient: recipient,
                    proof_requirement_hash: proofHash
                })
            };

            const tx = await account.execute(call);
            alert(`Project creation transaction submitted! Hash: ${tx.transaction_hash}`);
        } catch (error) {
            console.error("Project creation failed:", error);
            alert("Failed to create project. See console.");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10 shadow-2xl"
        >
            <h3 className="text-xl font-semibold mb-6 text-teal-400">Project Details</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Project Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                        placeholder="e.g. Clean Water Initiative"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Funding Goal (ETH)</label>
                    <input
                        type="number"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                        placeholder="1.5"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Recipient Address</label>
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                        placeholder="0x..."
                        required
                    />
                </div>

                <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-medium text-gray-400">Proof Requirement Hash</label>
                        <button
                            type="button"
                            onClick={generateHash}
                            disabled={loading}
                            className="text-xs text-teal-400 hover:text-teal-300 underline disabled:opacity-50"
                        >
                            {loading ? "Generating..." : "Generate via Oracle"}
                        </button>
                    </div>
                    {proofHash && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 text-xs font-mono text-teal-200 break-all"
                        >
                            {proofHash}
                        </motion.div>
                    )}
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!proofHash}
                    className={clsx(
                        "w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg",
                        !proofHash
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-emerald-500/25"
                    )}
                >
                    Launch Project
                </motion.button>
            </form>
        </motion.div>
    );
}
