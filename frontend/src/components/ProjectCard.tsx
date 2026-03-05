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
                className="group relative overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-950/55 p-6 backdrop-blur-md transition-colors hover:border-cyan-400/35 hover:bg-slate-900/65"
            >
                <div className="flex justify-between items-start mb-4 gap-2">
                    <h3 className="text-xl font-bold text-slate-100 transition-colors group-hover:text-cyan-300">
                        {project.title}
                    </h3>
                    <span
                        className={clsx(
                            "text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap",
                            project.isCompleted
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        )}
                    >
                        {project.isCompleted ? "Completed" : "Active"}
                    </span>
                </div>

                <p className="mb-3 line-clamp-3 text-sm text-slate-300">{project.description}</p>

                <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                        className={clsx(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                            hasEvidence ? "border-emerald-400/30 text-emerald-300 bg-emerald-500/10" : "border-amber-300/30 text-amber-200 bg-amber-500/10"
                        )}
                    >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {hasEvidence ? "Evidence Complete" : "Evidence Incomplete"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 bg-slate-800/35 px-2 py-1 text-slate-200">
                        <FileCheck2 className="h-3.5 w-3.5" />
                        Proof Links: {project.proofLinks?.length ?? 0}
                    </span>
                </div>

                <p className="mb-4 break-all text-[11px] font-mono text-slate-400">
                    Proof Hash: <span className="text-slate-200">{project.proofHash || "Not set"}</span>
                </p>

                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm text-slate-300">
                        <span>
                            Raised: <span className="text-white font-semibold">{project.raised.toFixed(4)} ETH</span>
                        </span>
                        <span>
                            Goal: <span className="text-white font-semibold">{project.goal.toFixed(4)} ETH</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-300">
                        Fixed donation per donor:{" "}
                        <span className="font-semibold text-white">{project.fixedDonation.toFixed(4)} ETH</span>
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setShowDetails(true)}
                        className="rounded-xl border border-slate-600/60 bg-slate-900/65 py-3 font-semibold text-slate-100 transition-all hover:bg-slate-800/70"
                    >
                        View Evidence
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onDonate(project)}
                        disabled={project.isCompleted || project.hasDonated || !reviewedEvidence || !hasEvidence}
                        className={clsx(
                            "py-3 rounded-xl font-bold transition-all shadow-lg",
                            project.isCompleted
                                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                : project.hasDonated || !reviewedEvidence || !hasEvidence
                                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                                  : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-emerald-500/25 hover:from-teal-400 hover:to-emerald-500"
                        )}
                    >
                        {project.isCompleted ? "Funded & Verified" : project.hasDonated ? "Already Donated" : "Donate"}
                    </motion.button>
                </div>
                {!reviewedEvidence && !project.isCompleted && (
                    <p className="mt-2 text-[11px] text-slate-400">Open View Evidence and mark reviewed to enable donate.</p>
                )}
            </motion.div>

            {showDetails && (
                <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-500/35 bg-gradient-to-b from-slate-950 to-slate-900 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-xl font-bold text-slate-100">{project.title}</h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    Project #{project.id}
                                    {project.createdAt ? ` • ${new Date(project.createdAt).toLocaleString()}` : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetails(false)}
                                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
                                aria-label="Close details"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-5 space-y-5">
                            <div>
                                <p className="text-sm font-semibold text-cyan-300">Detailed Description</p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-200">{project.description}</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-600/50 bg-slate-900/60 p-3">
                                    <p className="mb-2 inline-flex items-center gap-1 text-xs text-slate-200">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Image Evidence
                                    </p>
                                    {project.imageUrl ? (
                                        <a className="inline-flex rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 no-underline break-all hover:bg-cyan-500/20" href={project.imageUrl} target="_blank" rel="noreferrer">
                                            {project.imageUrl}
                                        </a>
                                    ) : (
                                        <p className="text-xs text-amber-200">No image evidence submitted.</p>
                                    )}
                                </div>
                                <div className="rounded-xl border border-slate-600/50 bg-slate-900/60 p-3">
                                    <p className="mb-2 inline-flex items-center gap-1 text-xs text-slate-200">
                                        <PlayCircle className="h-3.5 w-3.5" />
                                        Video Evidence
                                    </p>
                                    {project.videoUrl ? (
                                        <a className="inline-flex rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 no-underline break-all hover:bg-cyan-500/20" href={project.videoUrl} target="_blank" rel="noreferrer">
                                            {project.videoUrl}
                                        </a>
                                    ) : (
                                        <p className="text-xs text-amber-200">No video evidence submitted.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-600/50 bg-slate-900/60 p-3">
                                <p className="text-sm font-semibold text-violet-300">Supporting Proof Links</p>
                                {project.proofLinks && project.proofLinks.length > 0 ? (
                                    <ul className="mt-2 space-y-2">
                                        {project.proofLinks.map((link) => (
                                            <li key={link}>
                                                <a className="inline-flex rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 no-underline break-all hover:bg-violet-500/20" href={link} target="_blank" rel="noreferrer">
                                                    {link}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-amber-200 mt-2">No proof links attached.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-600/50 bg-slate-900/60 p-3">
                                <p className="break-all font-mono text-xs text-slate-300">On-chain Proof Hash: {project.proofHash}</p>
                                {project.creatorAddress && (
                                    <p className="mt-1 break-all text-xs text-slate-400">Creator: {project.creatorAddress}</p>
                                )}
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm text-slate-100">
                                <input
                                    type="checkbox"
                                    checked={reviewedEvidence}
                                    onChange={(e) => setReviewedEvidence(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                I reviewed this evidence and accept donor risk before donating.
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProjectCard;
