"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useWallet } from "@/context/WalletContext";
import { byteArray, RpcProvider, cairo } from "starknet";
import { getPifpContractAddress } from "@/lib/config";
import { useNotification } from "@/context/NotificationContext";
import { waitForTransactionOutcome } from "@/lib/tx";
import { saveProjectMetadata } from "@/lib/projectMetadata";
import { useSecurity } from "@/context/SecurityContext";
import { sha256ToFeltHex } from "@/lib/hash";

function isHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

const PROOF_LINK_SEPARATOR = "|||";
const PROOF_HASH_VISIBILITY_MS = 20000;

export default function CreateProjectForm() {
    const { account, address } = useWallet();
    const { notify } = useNotification();
    const { ensureVerifiedAction } = useSecurity();
    const provider = useMemo(
        () => new RpcProvider({ nodeUrl: "https://starknet-sepolia-rpc.publicnode.com" }),
        []
    );

    const [title, setTitle] = useState("");
    const [goal, setGoal] = useState("");
    const [fixedDonation, setFixedDonation] = useState("");
    const [recipient, setRecipient] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [proofLinksInput, setProofLinksInput] = useState("");
    const [proofHash, setProofHash] = useState("");
    const [proofHashVisible, setProofHashVisible] = useState(false);
    const [copiedProofHash, setCopiedProofHash] = useState(false);
    const [copiedProofPackage, setCopiedProofPackage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const proofLinks = proofLinksInput
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
    const proofCopied = copiedProofHash || copiedProofPackage;
    const canLaunchProject = Boolean(proofHash) && proofCopied;

    const canonicalEvidence = JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl.trim(),
        video_url: videoUrl.trim(),
        proof_links: proofLinks.map((v) => v.trim()).sort()
    });

    useEffect(() => {
        if (!proofHashVisible || copiedProofHash || !proofHash) return;

        const timeoutId = window.setTimeout(() => {
            setProofHashVisible(false);
            notify({
                title: "Proof hash hidden",
                message: "Copy it before it disappears. Generate again if you still need to see it.",
                type: "info"
            });
        }, PROOF_HASH_VISIBILITY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [copiedProofHash, notify, proofHash, proofHashVisible]);

    const generateHash = async () => {
        if (!title || !description || !imageUrl || !videoUrl || proofLinks.length < 1) {
            notify({
                title: "Missing evidence data",
                message: "Fill title, description, image, video, and at least one proof link before hashing.",
                type: "error"
            });
            return;
        }

        setLoading(true);
        try {
            const localHash = await sha256ToFeltHex(canonicalEvidence);
            setProofHash(localHash);
            setProofHashVisible(true);
            setCopiedProofHash(false);
            setCopiedProofPackage(false);
            notify({
                title: "Proof hash generated",
                message: "This hash is shown once. Copy it now or copy the proof package before it disappears.",
                type: "info"
            });
        } catch (error) {
            notify({
                title: "Hash generation failed",
                message: error instanceof Error ? error.message : "Could not generate hash locally.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const fillDemoData = () => {
        setTitle("Maternal Clinic Solar Power Upgrade");
        setGoal("1.8");
        setFixedDonation("0.05");
        setRecipient(address || account?.address?.toString() || "");
        setDescription(
            "This project will install a 15kW solar plus battery backup system for a maternal clinic to guarantee 24/7 power for vaccine refrigeration, delivery-room lighting, and emergency equipment. Funds cover panels, inverter, batteries, certified installation, and maintenance. Milestones include procurement receipts, installation photos, commissioning video, and engineer sign-off."
        );
        setImageUrl("https://images.unsplash.com/photo-1584515933487-779824d29309");
        setVideoUrl("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
        setProofLinksInput(
            "https://example.org/clinic-needs-assessment.pdf\nhttps://example.org/equipment-quote-and-bill-of-materials.pdf\nhttps://example.org/local-health-board-approval-letter.pdf"
        );
        setProofHash("");
        setProofHashVisible(false);
        setCopiedProofHash(false);
        setCopiedProofPackage(false);
        setAgreed(true);
        notify({
            title: "Demo data loaded",
            message: "All project fields were prefilled. Click 'Generate via Oracle', then launch.",
            type: "info"
        });
    };

    const validateForm = (): string | null => {
        if (title.trim().length < 5) return "Title must be at least 5 characters.";
        if (!goal || Number(goal) <= 0) return "Funding goal must be greater than zero.";
        if (!fixedDonation || Number(fixedDonation) <= 0) return "Fixed donation amount must be greater than zero.";
        if (Number(fixedDonation) > Number(goal)) return "Fixed donation amount cannot exceed total funding goal.";
        if (!recipient.startsWith("0x")) return "Recipient must be a valid Starknet address.";
        if (!proofHash.startsWith("0x")) return "Generate or provide a valid proof hash.";
        if (description.trim().length < 80) return "Description must be at least 80 characters.";
        if (!isHttpUrl(imageUrl)) return "Image URL must be a valid http(s) URL.";
        if (!isHttpUrl(videoUrl)) return "Video URL must be a valid http(s) URL.";
        if (proofLinks.length < 2) return "Add at least 2 supporting proof links.";
        if (!proofLinks.every(isHttpUrl)) return "All proof links must be valid http(s) URLs.";
        if (!agreed) return "Please confirm authenticity declaration before launching.";
        if (!copiedProofHash && !copiedProofPackage) {
            return "Copy proof hash or proof package before launching. If you do not keep it, you cannot submit proof later.";
        }
        return null;
    };

    const copyProofHash = async () => {
        if (!proofHash) return;
        await navigator.clipboard.writeText(proofHash);
        setCopiedProofHash(true);
        setProofHashVisible(false);
        notify({
            title: "Proof hash copied",
            message: "Stored to clipboard. Keep it safe for proof submission.",
            type: "success"
        });
    };

    const copyProofPackage = async () => {
        await navigator.clipboard.writeText(canonicalEvidence);
        setCopiedProofPackage(true);
        setProofHashVisible(false);
        notify({
            title: "Proof package copied",
            message: "Evidence package copied. Store it safely to regenerate proof hash later.",
            type: "success"
        });
    };

    const normalizeFeltInput = (value: any): string => {
        const val = value.toString();
        return val === "0x" ? "0x0" : val;
    };

    const normalizeHexFelt = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed) return "0x0";
        try {
            return `0x${BigInt(trimmed).toString(16)}`;
        } catch {
            return trimmed;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!account) {
            notify({
                title: "Wallet not connected",
                message: "Connect your wallet before creating a project.",
                type: "info"
            });
            return;
        }
        const otpToken = await ensureVerifiedAction(
            "create_project",
            "OTP verification is required before creating a project."
        );
        if (!otpToken) {
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            notify({
                title: "Project validation failed",
                message: validationError,
                type: "error"
            });
            return;
        }

        try {
            const contractAddress = getPifpContractAddress();
            const accountAddress = account.address?.toString().toLowerCase();
            if (accountAddress && contractAddress.toLowerCase() === accountAddress) {
                throw new Error(
                    "NEXT_PUBLIC_PIFP_CONTRACT_ADDRESS is set to your wallet account address. Use the deployed PIFP contract address."
                );
            }
            const goalUint256 = cairo.uint256(BigInt(parseFloat(goal) * 1e18));
            const fixedDonationUint256 = cairo.uint256(BigInt(parseFloat(fixedDonation) * 1e18));
            const titleCalldata = byteArray.byteArrayFromString(title.trim());
            const descriptionCalldata = byteArray.byteArrayFromString(description.trim());
            const imageCalldata = byteArray.byteArrayFromString(imageUrl.trim());
            const videoCalldata = byteArray.byteArrayFromString(videoUrl.trim());
            const proofLinksCalldata = byteArray.byteArrayFromString(proofLinks.join(PROOF_LINK_SEPARATOR));

            const call = {
                contractAddress,
                entrypoint: "create_project",
                calldata: [
                    titleCalldata.data.length.toString(),
                    ...titleCalldata.data.map(normalizeFeltInput),
                    normalizeFeltInput(titleCalldata.pending_word),
                    titleCalldata.pending_word_len.toString(),
                    descriptionCalldata.data.length.toString(),
                    ...descriptionCalldata.data.map(normalizeFeltInput),
                    normalizeFeltInput(descriptionCalldata.pending_word),
                    descriptionCalldata.pending_word_len.toString(),
                    imageCalldata.data.length.toString(),
                    ...imageCalldata.data.map(normalizeFeltInput),
                    normalizeFeltInput(imageCalldata.pending_word),
                    imageCalldata.pending_word_len.toString(),
                    videoCalldata.data.length.toString(),
                    ...videoCalldata.data.map(normalizeFeltInput),
                    normalizeFeltInput(videoCalldata.pending_word),
                    videoCalldata.pending_word_len.toString(),
                    proofLinksCalldata.data.length.toString(),
                    ...proofLinksCalldata.data.map(normalizeFeltInput),
                    normalizeFeltInput(proofLinksCalldata.pending_word),
                    proofLinksCalldata.pending_word_len.toString(),
                    goalUint256.low.toString(),
                    goalUint256.high.toString(),
                    fixedDonationUint256.low.toString(),
                    fixedDonationUint256.high.toString(),
                    normalizeHexFelt(recipient),
                    normalizeHexFelt(proofHash),
                    normalizeHexFelt(otpToken)
                ]
            };

            const tx = await account.execute(call);
            notify({
                title: "Project creation submitted",
                message: "Transaction sent. Waiting for on-chain confirmation.",
                type: "success",
                txHash: tx.transaction_hash
            });

            const result = await waitForTransactionOutcome(provider, tx.transaction_hash);
            if (result.status !== "confirmed") {
                notify({
                    title: "Project creation reverted",
                    message: `Transaction reverted (${result.executionStatus}).`,
                    type: "error",
                    txHash: tx.transaction_hash
                });
                return;
            }

            const countCall = await provider.callContract({
                contractAddress,
                entrypoint: "get_project_count",
                calldata: []
            });
            const latestProjectId = Number(BigInt(countCall[0] ?? "0"));

            if (latestProjectId > 0) {
                saveProjectMetadata(contractAddress, latestProjectId, {
                    title: title.trim(),
                    description: description.trim(),
                    imageUrl: imageUrl.trim(),
                    videoUrl: videoUrl.trim(),
                    proofLinks,
                    proofHash,
                    createdAt: Date.now(),
                    creatorAddress: address || undefined
                });
            }

            notify({
                title: "Project confirmed",
                message: `Project #${latestProjectId || "new"} is live with full evidence profile.`,
                type: "success",
                txHash: tx.transaction_hash
            });

            setTitle("");
            setGoal("");
            setFixedDonation("");
            setRecipient("");
            setDescription("");
            setImageUrl("");
            setVideoUrl("");
            setProofLinksInput("");
            setProofHash("");
            setProofHashVisible(false);
            setCopiedProofHash(false);
            setCopiedProofPackage(false);
            setAgreed(false);
            window.dispatchEvent(new Event("pifp:projects-updated"));
            setTimeout(() => window.dispatchEvent(new Event("pifp:projects-updated")), 8000);
            setTimeout(() => window.dispatchEvent(new Event("pifp:projects-updated")), 18000);
        } catch (error) {
            console.error("Project creation failed:", error);
            notify({
                title: "Project creation failed",
                message: error instanceof Error ? error.message : "Unknown creation error.",
                type: "error"
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-8"
        >
            <div className="mb-6 flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-teal-400">Project Details</h3>
                <button
                    type="button"
                    onClick={fillDemoData}
                    className="rounded-lg border border-teal-300/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-500/20"
                >
                    Use Demo Data
                </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Impact Description (min 80 chars)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full min-h-[130px] bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                        placeholder="Describe the exact deliverable, milestones, location, beneficiaries, and verification method."
                        required
                    />
                    <p className="text-xs mt-1 text-gray-500">{description.trim().length}/80 minimum</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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
                        <label className="block text-sm font-medium text-gray-400 mb-2">Fixed Donation Per Donor (ETH)</label>
                        <input
                            type="number"
                            value={fixedDonation}
                            onChange={(e) => setFixedDonation(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                            placeholder="0.05"
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Image Evidence URL</label>
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                            placeholder="https://..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Video Evidence URL</label>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                            placeholder="https://..."
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Supporting Proof Links (one URL per line, min 2)
                    </label>
                    <textarea
                        value={proofLinksInput}
                        onChange={(e) => setProofLinksInput(e.target.value)}
                        className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all hover:border-white/20"
                        placeholder={"https://public-doc-1\nhttps://public-doc-2"}
                        required
                    />
                </div>

                <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-medium text-gray-400">Proof Requirement Hash (On-chain)</label>
                        <button
                            type="button"
                            onClick={generateHash}
                            disabled={loading}
                            className="text-xs text-teal-400 hover:text-teal-300 underline disabled:opacity-50"
                        >
                            {loading ? "Generating..." : "Generate via Oracle"}
                        </button>
                    </div>
                    {proofHash && proofHashVisible && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-rose-500/10 border border-rose-400/30 rounded-lg p-4 text-xs font-mono text-rose-100 break-all"
                        >
                            <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                                Copy This Now
                            </p>
                            <p>{proofHash}</p>
                            <p className="mt-3 font-sans text-[11px] text-rose-200/80">
                                This proof hash behaves like a one-time secret. If you do not copy it now, it will disappear and you must regenerate it before launch.
                            </p>
                        </motion.div>
                    )}
                    {proofHash && !proofHashVisible && (
                        <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300">
                            <p className="font-semibold text-white">
                                Proof hash hidden
                            </p>
                            <p className="mt-1 text-gray-400">
                                {proofCopied
                                    ? "You already copied the required proof material."
                                    : "Generate again if you need to reveal and copy the proof hash before launch."}
                            </p>
                        </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={copyProofHash}
                            disabled={!proofHash}
                            className={clsx(
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                                !proofHash
                                    ? "cursor-not-allowed border-white/10 bg-white/5 text-gray-500"
                                    : "border-teal-300/30 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20"
                            )}
                        >
                            {copiedProofHash ? "Proof Hash Copied" : "Copy Proof Hash"}
                        </button>
                        <button
                            type="button"
                            onClick={copyProofPackage}
                            className={clsx(
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                                "border-cyan-300/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                            )}
                        >
                            {copiedProofPackage ? "Proof Package Copied" : "Copy Proof Package"}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-amber-300">
                        Warning: this value will not be shown to donors or in the evidence modal. Copy the proof hash or proof package before launch or you will not be able to submit proof later.
                    </p>
                </div>

                <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-4">
                    <p className="text-xs text-amber-100">
                        Declaration: You confirm the evidence is authentic and misuse/scam submissions may be publicly
                        flagged and rejected.
                    </p>
                    <label className="mt-3 inline-flex items-center gap-2 text-sm text-amber-50">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="h-4 w-4"
                        />
                        I confirm this submission is truthful and verifiable.
                    </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="text-sm font-semibold text-white mb-2">Preview Before Publish</p>
                    <p className="text-white font-medium">{title || "Untitled Project"}</p>
                    <p className="text-xs text-gray-400 mt-1">{description || "No description yet."}</p>
                    <div className="mt-3 grid gap-2 text-xs text-gray-300">
                        <p>Fixed donation per donor: {fixedDonation || "Not set"} ETH</p>
                        <p>Image: {imageUrl || "Not set"}</p>
                        <p>Video: {videoUrl || "Not set"}</p>
                        <p>Proof links: {proofLinks.length}</p>
                        <p>Proof credential status: {proofCopied ? "Copied and secured" : proofHash ? "Generated but not secured" : "Not generated"}</p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={!canLaunchProject}
                    className={clsx(
                        "w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg",
                        !canLaunchProject
                            ? "cursor-not-allowed bg-gray-800 text-gray-500"
                            : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-emerald-500/25"
                    )}
                >
                    Launch Project
                </motion.button>
            </form>
        </motion.div>
    );
}
// Finalizing commit 21: form validation improvements
