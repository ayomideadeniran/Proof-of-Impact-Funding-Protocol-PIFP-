"use client";
import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

type Project = {
    id: number;
    title: string;
    description: string;
    goal: number;
    raised: number;
    proofHash: string;
    isCompleted: boolean;
};

interface ProjectCardProps {
    project: Project;
    onDonate: (id: number) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDonate }) => {
    const progress = Math.min((project.raised / project.goal) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors"
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
                    {project.title}
                </h3>
                <span
                    className={clsx(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        project.isCompleted
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    )}
                >
                    {project.isCompleted ? "Completed" : "Active"}
                </span>
            </div>

            <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                {project.description}
            </p>

            <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm text-gray-300">
                    <span>Raised: <span className="text-white font-semibold">{project.raised} ETH</span></span>
                    <span>Goal: <span className="text-white font-semibold">{project.goal} ETH</span></span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDonate(project.id)}
                disabled={project.isCompleted}
                className={clsx(
                    "w-full py-3 rounded-xl font-bold transition-all shadow-lg",
                    project.isCompleted
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-emerald-500/25 hover:from-teal-400 hover:to-emerald-500"
                )}
            >
                {project.isCompleted ? "Funded & Verified" : "Donate Now"}
            </motion.button>
        </motion.div>
    );
};

export default ProjectCard;
