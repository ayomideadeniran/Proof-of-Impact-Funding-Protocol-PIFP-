import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProjectList from "@/components/ProjectList";
import CreateProjectForm from "@/components/CreateProjectForm";
import VerificationForm from "@/components/VerificationForm";

export default function Home() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-900/20 rounded-full blur-[120px]" />
            </div>

            <Navbar />

            <div className="relative z-10 pt-20">
                <Hero />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-24">
                    <section id="projects">
                        <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-purple-500">
                            Featured Projects
                        </h2>
                        <ProjectList />
                    </section>

                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        <section id="create">
                            <h2 className="text-2xl font-bold mb-6 text-teal-400 border-l-4 border-teal-500 pl-4">
                                Start a New Project
                            </h2>
                            <CreateProjectForm />
                        </section>

                        <section id="verify">
                            <h2 className="text-2xl font-bold mb-6 text-purple-400 border-l-4 border-purple-500 pl-4">
                                Submit Proof of Impact
                            </h2>
                            <VerificationForm />
                        </section>
                    </div>
                </div>

                <footer className="mt-20 py-8 border-t border-white/10 text-center text-gray-500 text-sm">
                    <p>Built for Starknet Re{"{define}"} Hackathon • Trust-Minimized Funding Protocol</p>
                </footer>
            </div>
        </main>
    );
}
