"use client";
import { useState } from "react";
import ProjectCard from "./ProjectCard";
import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { CallData, cairo } from "starknet";

// Replace with deployed contract address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder

type Project = {
    id: number;
    title: string;
    description: string;
    goal: number;
    raised: number;
    proofHash: string;
    isCompleted: boolean;
};

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
    const { account } = useWallet();

    const handleDonate = async (id: number) => {
        if (!account) {
            alert("Please connect your wallet first.");
            return;
        }

        try {
            // Mock donation amount (0.01 ETH)
            const amount = cairo.uint256(10000000000000000n);
            // Mock commitment hash
            const commitment = "0x123";

            const call = {
                contractAddress: CONTRACT_ADDRESS,
                entrypoint: "donate",
                calldata: CallData.compile({
                    project_id: id,
                    amount: amount,
                    commitment: commitment
                })
            };

            const tx = await account.execute(call);
            alert(`Donation submitted! Transaction Hash: ${tx.transaction_hash}`);
        } catch (error) {
            console.error("Donation failed:", error);
            alert("Donation failed. See console for details.");
        }
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
