"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProjectCard from "./ProjectCard";
import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { byteArray, CallData, RpcProvider, cairo } from "starknet";
import { getPifpContractAddress, getPifpTokenAddress } from "@/lib/config";
import { useNotification } from "@/context/NotificationContext";
import { waitForTransactionOutcome } from "@/lib/tx";
import { loadProjectMetadataByProofHash, loadProjectMetadataMap } from "@/lib/projectMetadata";
import { useSecurity } from "@/context/SecurityContext";

function readU256(low?: string, high?: string): bigint {
    return BigInt(low ?? "0") + (BigInt(high ?? "0") << 128n);
}

function formatEth(wei: bigint): string {
    const whole = wei / 10n ** 18n;
    const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${frac}`;
}

function parseByteArray(calldata: string[], startIndex: number): { value: string; nextIndex: number } {
    const wordCount = Number(BigInt(calldata[startIndex] ?? "0"));
    const data = calldata.slice(startIndex + 1, startIndex + 1 + wordCount);
    const pendingWord = calldata[startIndex + 1 + wordCount] ?? "0x0";
    const pendingWordLen = Number(BigInt(calldata[startIndex + 2 + wordCount] ?? "0"));

    return {
        value: byteArray.stringFromByteArray({
            data,
            pending_word: pendingWord,
            pending_word_len: pendingWordLen
        }),
        nextIndex: startIndex + 3 + wordCount
    };
}

const PROOF_LINK_SEPARATOR = "|||";

type Project = {
    id: number;
    title: string;
    description: string;
    goal: number;
    fixedDonation: number;
    fixedDonationWei: bigint;
    raised: number;
    proofHash: string;
    isCompleted: boolean;
    imageUrl?: string;
    videoUrl?: string;
    proofLinks?: string[];
    creatorAddress?: string;
    createdAt?: number;
    hasDonated: boolean;
};

 // Handles project fetching, pagination, and robust ByteArray decoding
export default function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { account, address } = useWallet();
    const { notify } = useNotification();
    const { ensureVerifiedAction } = useSecurity();
    const provider = useMemo(
        () => new RpcProvider({ nodeUrl: "https://starknet-sepolia-rpc.publicnode.com" }),
        []
    );

    const fetchProjects = useCallback(async () => {
        if (!address) {
            setProjects([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const contractAddress = getPifpContractAddress();
            const metadataMap = loadProjectMetadataMap(contractAddress);

            const countCall = await provider.callContract({
                contractAddress,
                entrypoint: "get_project_count",
                calldata: []
            });

            const count = Number(BigInt(countCall[0] ?? "0"));
            if (count === 0) {
                setProjects([]);
                return;
            }

            const onChainProjects = await Promise.all(
                Array.from({ length: count }, async (_, index) => {
                    const projectId = index + 1;
                    const projectCall = await provider.callContract({
                        contractAddress,
                        entrypoint: "get_project",
                        calldata: CallData.compile({ project_id: projectId })
                    });

                    let cursor = 1;
                    const parsedTitle = parseByteArray(projectCall, cursor);
                    cursor = parsedTitle.nextIndex;
                    const parsedDescription = parseByteArray(projectCall, cursor);
                    cursor = parsedDescription.nextIndex;
                    const parsedImage = parseByteArray(projectCall, cursor);
                    cursor = parsedImage.nextIndex;
                    const parsedVideo = parseByteArray(projectCall, cursor);
                    cursor = parsedVideo.nextIndex;
                    const parsedProofLinks = parseByteArray(projectCall, cursor);
                    cursor = parsedProofLinks.nextIndex;

                    const goalWei = readU256(projectCall[cursor], projectCall[cursor + 1]);
                    const fixedDonationWei = readU256(projectCall[cursor + 2], projectCall[cursor + 3]);
                    const raisedWei = readU256(projectCall[cursor + 4], projectCall[cursor + 5]);
                    const creatorAddress = projectCall[cursor + 6];
                    const recipientAddress = projectCall[cursor + 7];
                    const proofHash = projectCall[cursor + 8] ?? "0x0";
                    const isCompleted = (projectCall[cursor + 9] ?? "0x0") !== "0x0";
                    const localMetadata =
                        metadataMap[String(projectId)] ?? loadProjectMetadataByProofHash(proofHash) ?? undefined;
                    const donatedCall = await provider.callContract({
                        contractAddress,
                        entrypoint: "has_donated",
                        calldata: CallData.compile({ project_id: projectId, donor: address })
                    });
                    const hasDonated = (donatedCall[0] ?? "0x0") !== "0x0";
                    const onChainProofLinks = parsedProofLinks.value
                        .split(PROOF_LINK_SEPARATOR)
                        .map((link) => link.trim())
                        .filter(Boolean);

                    return {
                        id: Number(BigInt(projectCall[0] ?? `${projectId}`)),
                        title: localMetadata?.title ?? (parsedTitle.value || `Project #${projectId}`),
                        description:
                            localMetadata?.description ?? (parsedDescription.value || `On-chain project #${projectId}`),
                        goal: Number(goalWei) / 1e18,
                        fixedDonation: Number(fixedDonationWei) / 1e18,
                        fixedDonationWei,
                        raised: Number(raisedWei) / 1e18,
                        proofHash,
                        isCompleted,
                        imageUrl: localMetadata?.imageUrl ?? parsedImage.value,
                        videoUrl: localMetadata?.videoUrl ?? parsedVideo.value,
                        proofLinks: onChainProofLinks.length > 0 ? onChainProofLinks : localMetadata?.proofLinks ?? [],
                        creatorAddress: localMetadata?.creatorAddress ?? creatorAddress ?? recipientAddress,
                        createdAt: localMetadata?.createdAt,
                        hasDonated
                    } satisfies Project;
                })
            );

            setProjects(onChainProjects);
        } catch (error) {
            console.error("Failed to fetch projects:", error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, [address, provider]);

    useEffect(() => {
        if (!address) {
            setProjects([]);
            setLoading(false);
            return;
        }
        fetchProjects();
    }, [address, fetchProjects]);

    useEffect(() => {
        const refreshProjects = () => {
            if (!address) return;
            void fetchProjects();
        };

        window.addEventListener("pifp:projects-updated", refreshProjects);
        return () => window.removeEventListener("pifp:projects-updated", refreshProjects);
    }, [address, fetchProjects]);

    const handleDonate = async (project: Project) => {
        if (!account) {
            notify({
                title: "Wallet not connected",
                message: "Connect your wallet before donating.",
                type: "info"
            });
            return;
        }
        const otpToken = await ensureVerifiedAction(
            "donate",
            "OTP verification is required before donating.",
            project.id
        );
        if (!otpToken) {
            return;
        }
        if (project.hasDonated) {
            notify({
                title: "Already donated",
                message: "This wallet already donated to this project.",
                type: "info"
            });
            return;
        }

        try {
            const contractAddress = getPifpContractAddress();
            const tokenAddress = getPifpTokenAddress();
            const accountAddress = account.address?.toString().toLowerCase();
            if (accountAddress && contractAddress.toLowerCase() === accountAddress) {
                throw new Error(
                    "NEXT_PUBLIC_PIFP_CONTRACT_ADDRESS is set to your wallet account address. Use the deployed PIFP contract address."
                );
            }

            const balanceCall = await provider.callContract({
                contractAddress: tokenAddress,
                entrypoint: "balanceOf",
                calldata: CallData.compile({ account: account.address })
            });
            const walletBalanceWei = readU256(balanceCall[0], balanceCall[1]);
            if (walletBalanceWei < project.fixedDonationWei) {
                throw new Error(
                    `Insufficient token balance. Required ${formatEth(project.fixedDonationWei)} ETH, wallet has ${formatEth(walletBalanceWei)} ETH. Fund your wallet/token first.`
                );
            }

            const amount = cairo.uint256(project.fixedDonationWei);
            const commitment = `0x${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;

            const approveCall = {
                contractAddress: tokenAddress,
                entrypoint: "approve",
                calldata: CallData.compile({
                    spender: contractAddress,
                    amount
                })
            };

            const donateCall = {
                contractAddress,
                entrypoint: "donate",
                calldata: CallData.compile({
                    project_id: project.id,
                    amount: amount,
                    commitment: commitment,
                    otp_token: otpToken
                })
            };

            const tx = await account.execute([approveCall, donateCall]);
            notify({
                title: "Donation submitted",
                message: `Approve + donation for project #${project.id} has been sent.`,
                type: "success",
                txHash: tx.transaction_hash
            });
            void waitForTransactionOutcome(provider, tx.transaction_hash)
                .then((result) => {
                    if (result.status === "confirmed") {
                        notify({
                            title: "Donation confirmed",
                            message: `Project #${project.id} donation is confirmed on-chain (${result.finalityStatus}).`,
                            type: "success",
                            txHash: tx.transaction_hash
                        });
                    } else {
                        notify({
                            title: "Donation reverted",
                            message: `The transaction reverted (${result.executionStatus}).`,
                            type: "error",
                            txHash: tx.transaction_hash
                        });
                    }
                })
                .catch(() => {
                    notify({
                        title: "Donation pending",
                        message: "Transaction submitted, but confirmation check timed out. Verify on Starkscan.",
                        type: "info",
                        txHash: tx.transaction_hash
                    });
                });
            window.dispatchEvent(new Event("pifp:projects-updated"));
            setTimeout(() => window.dispatchEvent(new Event("pifp:projects-updated")), 8000);
        } catch (error) {
            console.error("Donation failed:", error);
            notify({
                title: "Donation failed",
                message: error instanceof Error ? error.message : "Transaction failed. Check wallet confirmation and try again.",
                type: "error"
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="my-6 grid grid-cols-1 gap-5 sm:my-8 sm:gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
            {!address && (
                <p className="text-gray-300 col-span-full text-center rounded-xl border border-white/10 bg-white/5 py-6">
                    Connect wallet first to load your account-scoped project data.
                </p>
            )}
            {loading && (
                <p className="text-gray-400 col-span-full text-center">Loading projects from Starknet...</p>
            )}
            {!loading && address && projects.length === 0 && (
                <p className="text-gray-400 col-span-full text-center">No projects found on-chain yet.</p>
            )}
            {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onDonate={handleDonate} />
            ))}
        </motion.div>
    );
}
// Finalizing commit 22: pagination logic stabilization
