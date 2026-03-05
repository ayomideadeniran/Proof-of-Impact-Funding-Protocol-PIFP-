"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useNotification } from "@/context/NotificationContext";
import { useSecurity } from "@/context/SecurityContext";
import { sha256ToFeltHex } from "@/lib/hash";
import { CallData, RpcProvider } from "starknet";
import { getPifpContractAddress } from "@/lib/config";

const ORACLE_URL = process.env.NEXT_PUBLIC_ORACLE_URL ?? "http://127.0.0.1:3001";
const HASH_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;

function normalizeFeltHex(value: string): string {
    return `0x${BigInt(value).toString(16)}`;
}

function skipByteArray(calldata: string[], startIndex: number): number {
    const wordCount = Number(BigInt(calldata[startIndex] ?? "0"));
    return startIndex + 3 + wordCount;
}

export default function VerificationForm() {
    const [projectId, setProjectId] = useState("");
    const [proofData, setProofData] = useState("");
    const [proofHash, setProofHash] = useState("");
    const [directHashInput, setDirectHashInput] = useState("");
    const [loadingHash, setLoadingHash] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const { notify } = useNotification();
    const { ensureVerifiedAction } = useSecurity();
    const provider = new RpcProvider({ nodeUrl: "https://starknet-sepolia-rpc.publicnode.com" });

    const generateHash = async () => {
        if (!proofData.trim()) return;
        if (HASH_PATTERN.test(proofData.trim())) {
            setDirectHashInput(proofData.trim());
            setProofHash(proofData.trim());
            notify({
                title: "Direct hash detected",
                message: "Using the provided 0x... value directly as proof hash.",
                type: "info"
            });
            return;
        }
        setLoadingHash(true);
        try {
            const localHash = await sha256ToFeltHex(proofData.trim());
            setProofHash(localHash);
            notify({
                title: "Proof hash generated",
                message: "Proof was hashed locally in your browser.",
                type: "info"
            });
        } catch (error) {
            console.error("Hash generation failed:", error);
            notify({
                title: "Hash generation failed",
                message: "Could not generate local hash from the provided proof.",
                type: "error"
            });
        } finally {
            setLoadingHash(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        const otpToken = await ensureVerifiedAction(
            "submit_proof",
            "OTP verification is required before submitting proof.",
            Number(projectId)
        );
        if (!otpToken) {
            return;
        }

        const normalizedProofData = proofData.trim();
        const hashFromProofData = HASH_PATTERN.test(normalizedProofData) ? normalizedProofData : "";
        const chosenHash =
            directHashInput.trim() ||
            hashFromProofData ||
            proofHash.trim() ||
            (normalizedProofData ? await sha256ToFeltHex(normalizedProofData) : "");
        if (!chosenHash && !proofData.trim()) {
            notify({
                title: "Missing proof input",
                message: "Provide proof data or a proof hash to submit.",
                type: "error"
            });
            return;
        }

        setLoadingSubmit(true);
        try {
            const projectCall = await provider.callContract({
                contractAddress: getPifpContractAddress(),
                entrypoint: "get_project",
                calldata: CallData.compile({ project_id: Number(projectId) })
            });

            let cursor = 1;
            cursor = skipByteArray(projectCall, cursor);
            cursor = skipByteArray(projectCall, cursor);
            cursor = skipByteArray(projectCall, cursor);
            cursor = skipByteArray(projectCall, cursor);
            cursor = skipByteArray(projectCall, cursor);

            const fundsLow = BigInt(projectCall[cursor + 4] ?? "0");
            const fundsHigh = BigInt(projectCall[cursor + 5] ?? "0");
            const fundsCollectedWei = fundsLow + (fundsHigh << 128n);
            const expectedHash = projectCall[cursor + 8] ?? "0x0";
            const isCompleted = (projectCall[cursor + 9] ?? "0x0") !== "0x0";
            if (isCompleted) {
                throw new Error(`Project #${projectId} is already completed.`);
            }
            if (fundsCollectedWei === 0n) {
                throw new Error(
                    `Project #${projectId} has no donations yet. At least one donation is required before proof submission.`
                );
            }

            if (normalizeFeltHex(chosenHash) !== normalizeFeltHex(expectedHash)) {
                throw new Error(
                    `Invalid proof hash for project #${projectId}. Use the exact evidence bundle used at project creation.`
                );
            }

            const res = await fetch(`${ORACLE_URL}/submit-proof`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: Number(projectId),
                    proof_hash: chosenHash || undefined,
                    otp_token: otpToken
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error ?? "Proof submission failed.");
            }

            const txHash: string | undefined = data.tx_hash;
            const usedHash: string | undefined = data.proof_hash;
            if (usedHash) setProofHash(usedHash);

            notify({
                title: "Proof confirmed on-chain",
                message: `Project #${projectId} proof was submitted and accepted by oracle flow.`,
                type: "success",
                txHash
            });
            setProjectId("");
            setProofData("");
            setProofHash("");
            setDirectHashInput("");
            window.dispatchEvent(new Event("pifp:projects-updated"));
            setTimeout(() => window.dispatchEvent(new Event("pifp:projects-updated")), 8000);
        } catch (error) {
            console.error("Proof submission failed:", error);
            notify({
                title: "Proof submission failed",
                message: error instanceof Error ? error.message : "Unknown error while submitting proof.",
                type: "error"
            });
        } finally {
            setLoadingSubmit(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass rounded-2xl p-5 sm:p-8"
        >
            <h3 className="text-xl font-bold mb-6 text-white">Proof Submission</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Project ID</label>
                    <input
                        type="number"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/5 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:border-white/10"
                        placeholder="e.g. 1"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Proof Data (JSON/Text)</label>
                    <textarea
                        value={proofData}
                        onChange={(e) => setProofData(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/5 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:border-white/10 min-h-[120px]"
                        placeholder='{"data": "verified_impact_metrics"}'
                    />
                </div>

                <div className="pt-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={generateHash}
                        disabled={loadingHash || !proofData}
                        className={clsx(
                            "w-full py-3 rounded-xl font-medium text-sm transition-all mb-4 border border-white/5 shadow-sm",
                            loadingHash || !proofData
                                ? "bg-zinc-900/40 text-zinc-600 cursor-not-allowed"
                                : "bg-zinc-800/80 text-white hover:bg-zinc-700/80"
                        )}
                    >
                        {loadingHash ? "Verifying with Oracle..." : "Verify & Hash Data"}
                    </button>

                    {proofHash && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 text-xs font-mono text-cyan-300 break-all mb-4"
                        >
                            <span className="block text-cyan-400/50 mb-1">Generated Hash:</span>
                            {proofHash}
                        </motion.div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Or Enter Proof Hash Directly (Optional)</label>
                    <input
                        type="text"
                        value={directHashInput}
                        onChange={(e) => setDirectHashInput(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/5 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all hover:border-white/10 font-mono text-xs"
                        placeholder="0x..."
                    />
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loadingSubmit || (!proofHash && !directHashInput.trim() && !proofData.trim())}
                    className={clsx(
                        "w-full py-4 rounded-xl font-bold text-lg transition-all border",
                        loadingSubmit || (!proofHash && !directHashInput.trim() && !proofData.trim())
                            ? "bg-zinc-900/80 text-zinc-500 cursor-not-allowed border-white/5"
                            : "border-cyan-500/50 bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                    )}
                >
                    {loadingSubmit ? "Submitting Proof..." : "Submit Proof On-Chain"}
                </motion.button>
            </form>
        </motion.div>
    );
}
