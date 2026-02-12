"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export default function VerificationForm() {
    const [projectId, setProjectId] = useState("");
    const [proofData, setProofData] = useState("");
    const [proofHash, setProofHash] = useState("");
    const [loading, setLoading] = useState(false);

    const generateHash = async () => {
        setLoading(true);
        // Simulate oracle verification
        setTimeout(() => {
            setProofHash("0x" + Math.random().toString(16).substr(2, 64)); // Mock hash
            setLoading(false);
        }, 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Submitting proof for Project #${projectId}. Hash: ${proofHash}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10 shadow-2xl"
        >
            <h3 className="text-xl font-semibold mb-6 text-purple-400">Proof Submission</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Project ID</label>
                    <input
                        type="number"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all hover:border-white/20"
                        placeholder="e.g. 1"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Proof Data (JSON/Text)</label>
                    <textarea
                        value={proofData}
                        onChange={(e) => setProofData(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all hover:border-white/20 min-h-[120px]"
                        placeholder='{"data": "verified_impact_metrics"}'
                        required
                    />
                </div>

                <div className="pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={generateHash}
                        disabled={loading || !proofData}
                        className={clsx(
                            "w-full py-3 rounded-lg font-medium text-sm transition-all mb-4",
                            loading || !proofData
                                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                                : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                        )}
                    >
                        {loading ? "Verifying with Oracle..." : "Verify & Hash Data"}
                    </button>

                    {proofHash && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs font-mono text-purple-200 break-all mb-4"
                        >
                            <span className="block text-purple-400/50 mb-1">Generated Hash:</span>
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
                            : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-purple-500/25"
                    )}
                >
                    Submit Proof On-Chain
                </motion.button>
            </form>
        </motion.div>
    );
}
