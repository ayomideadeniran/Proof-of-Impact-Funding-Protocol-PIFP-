"use client";
import { useState } from "react";
import ProjectCard from "./ProjectCard";
import { motion } from "framer-motion";

// Mock data type
type Project = {
    id: number;
    title: string;
    description: string;
    goal: number;
    raised: number;
    proofHash: string;
    isCompleted: boolean;
};

// Mock data
const MOCK_PROJECTS: Project[] = [
    {
        id: 1,
        title: "Clean Water for Village X",
        description: "Building a solar-powered water pump system.",
        goal: 5.0,
        raised: 2.1,
        proofHash: "0xabc123...",
        isCompleted: false,
    },
    {
        id: 2,
        title: "Reforestation in Area Y",
        description: "Planting 10,000 trees to combat desertification.",
        goal: 10.0,
        raised: 10.0,
        proofHash: "0xdef456...",
        isCompleted: true,
    },
    {
        id: 3,
        title: "Education Initiative Z",
        description: "Providing laptops and internet access to remote schools.",
        goal: 8.0,
        raised: 3.5,
        proofHash: "",
        isCompleted: false,
    }
];

export default function ProjectList() {
    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

    const handleDonate = (id: number) => {
        alert(`Initiating donation for Project #${id}. In production, this opens wallet signature.`);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8 px-4"
        >
            {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onDonate={handleDonate} />
            ))}
        </motion.div>
    );
}
