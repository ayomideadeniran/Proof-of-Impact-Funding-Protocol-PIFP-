"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { FileCheck2, Image as ImageIcon, PlayCircle, ShieldCheck, X } from "lucide-react";

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

interface ProjectCardProps {
    project: Project;
    onDonate: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDonate }) => {
    const progress = Math.min((project.raised / Math.max(project.goal, 1)) * 100, 100);
    const [showDetails, setShowDetails] = useState(false);
    const [reviewedEvidence, setReviewedEvidence] = useState(false);
    const hasEvidence = Boolean(project.imageUrl && project.videoUrl && (project.proofLinks?.length ?? 0) >= 2);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:border-emerald-500/30 hover:bg-zinc-800/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]"
            >
                <div className="flex justify-between items-start mb-4 gap-2">
                    <h3 className="text-xl font-bold text-zinc-100 transition-colors group-hover:text-emerald-400">
                        {project.title}
                    </h3>
                    <span
                        className={clsx(
                            "text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold whitespace-nowrap border",
                            project.isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        )}
                    >
                        {project.isCompleted ? "Completed" : "Active"}
                    </span>
                </div>

                <p className="mb-4 line-clamp-3 text-sm text-zinc-400 leading-relaxed">{project.description}</p>

                <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                    <span
                        className={clsx(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                            hasEvidence ? "border-emerald-500/20 text-emerald-300 bg-emerald-500/10" : "border-amber-500/20 text-amber-300 bg-amber-500/10"
                        )}
                    >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {hasEvidence ? "Evidence Complete" : "Evidence Pending"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-zinc-800/50 px-2.5 py-1 text-zinc-300">
                        <FileCheck2 className="h-3.5 w-3.5" />
                        Proof Links: {project.proofLinks?.length ?? 0}
                    </span>
                </div>

                <div className="space-y-2 mb-6 p-4 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>
                            Raised <span className="text-white font-bold ml-1">{project.raised.toFixed(4)} <span className="text-[10px] text-zinc-500">ETH</span></span>
                        </span>
                        <span>
                            Goal <span className="text-white font-bold ml-1">{project.goal.toFixed(4)} <span className="text-[10px] text-zinc-500">ETH</span></span>
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                    <p className="text-[10px] text-zinc-500 text-right mt-1">
                        Fixed tier: <span className="font-semibold text-zinc-300">{project.fixedDonation.toFixed(4)} ETH</span>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setShowDetails(true)}
                        className="rounded-xl border border-white/10 bg-zinc-800/80 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-zinc-700 hover:border-white/20"
                    >
                        View Evidence
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onDonate(project)}
                        disabled={project.isCompleted || project.hasDonated || !reviewedEvidence || !hasEvidence}
                        className={clsx(
                            "py-3 rounded-xl text-sm font-bold transition-all shadow-md border",
                            project.isCompleted
                                ? "bg-zinc-900 border-white/5 text-zinc-600 cursor-not-allowed"
                                : project.hasDonated || !reviewedEvidence || !hasEvidence
                                    ? "bg-zinc-800/50 border-white/5 text-zinc-500 cursor-not-allowed"
                                    : "border-emerald-500/50 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                        )}
                    >
                        {project.isCompleted ? "Fully Funded" : project.hasDonated ? "Donated" : "Donate"}
                    </motion.button>
                </div>
                {!reviewedEvidence && !project.isCompleted && (
                    <p className="mt-3 text-center text-[10px] text-zinc-500">Review evidence to unlock donation.</p>
                )}
            </motion.div>

            {showDetails && (
                <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-md">
                    <button
                        type="button"
                        aria-label="Close evidence details"
                        onClick={() => setShowDetails(false)}
                        className="absolute inset-0 h-full w-full cursor-default"
                    />
                    <div className="relative flex h-full w-full items-start justify-center overflow-y-auto px-3 pb-4 pt-24 sm:px-4 sm:pb-6 sm:pt-28">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/98 shadow-2xl"
                    >
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/5 bg-zinc-950/95 px-5 py-5 backdrop-blur-xl sm:px-8 sm:py-6">
                            <div className="min-w-0">
                                <h4 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{project.title}</h4>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Project #{project.id}
                                    {project.createdAt ? ` • Published ${new Date(project.createdAt).toLocaleDateString()}` : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetails(false)}
                                className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[calc(100vh-9rem)] space-y-6 overflow-y-auto px-5 py-5 sm:max-h-[calc(100vh-11rem)] sm:px-8 sm:py-6">
                            <div>
                                <p className="text-sm font-semibold text-emerald-400 mb-2 uppercase tracking-wider text-[11px]">Impact Scope</p>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300 bg-white/5 p-4 rounded-xl border border-white/5">{project.description}</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                                    <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-200">
                                        <ImageIcon className="h-4 w-4 text-emerald-400" />
                                        Primary Image
                                    </p>
                                    {project.imageUrl ? (
                                        <a className="block w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-mono text-emerald-300 no-underline break-all hover:bg-emerald-500/20 transition-colors" href={project.imageUrl} target="_blank" rel="noreferrer">
                                            {project.imageUrl}
                                        </a>
                                    ) : (
                                        <p className="text-xs text-amber-500/70 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">No image provided.</p>
                                    )}
                                </div>
                                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                                    <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-200">
                                        <PlayCircle className="h-4 w-4 text-cyan-400" />
                                        Video Documentation
                                    </p>
                                    {project.videoUrl ? (
                                        <a className="block w-full rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-mono text-cyan-300 no-underline break-all hover:bg-cyan-500/20 transition-colors" href={project.videoUrl} target="_blank" rel="noreferrer">
                                            {project.videoUrl}
                                        </a>
                                    ) : (
                                        <p className="text-xs text-amber-500/70 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">No video provided.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                                <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider text-[11px]">Supporting Proof Links</p>
                                {project.proofLinks && project.proofLinks.length > 0 ? (
                                    <ul className="space-y-2">
                                        {project.proofLinks.map((link) => (
                                            <li key={link}>
                                                <a className="block w-full rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-mono text-violet-300 no-underline break-all hover:bg-violet-500/20 transition-colors" href={link} target="_blank" rel="noreferrer">
                                                    {link}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-amber-500/70 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">No external links attached.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-xs font-mono text-zinc-500">
                                <p className="break-all"><span className="text-zinc-400">Verification record:</span> Stored on-chain and checked during proof submission.</p>
                                {project.creatorAddress && (
                                    <p className="mt-2 break-all"><span className="text-zinc-400">Creator Wallet:</span> {project.creatorAddress}</p>
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="flex items-start gap-3 text-sm text-zinc-300 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={reviewedEvidence}
                                        onChange={(e) => setReviewedEvidence(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-500/50"
                                    />
                                    <span>
                                        <strong className="text-amber-200 block mb-1">Donor Responsibility Acknowledgment</strong>
                                        I have reviewed the evidence files and accept the risks associated with funding this project.
                                    </span>
                                </label>
                            </div>
                        </div>
                    </motion.div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProjectCard;
// Finalizing commit 25: project card styling
