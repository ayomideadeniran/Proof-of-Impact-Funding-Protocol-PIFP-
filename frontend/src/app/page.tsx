import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProjectList from "@/components/ProjectList";
import CreateProjectForm from "@/components/CreateProjectForm";
import VerificationForm from "@/components/VerificationForm";

export default function Home() {
    return (
        <main className="relative min-h-screen overflow-x-hidden bg-transparent text-white">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] h-[50vw] w-[50vw] max-h-[600px] max-w-[600px] rounded-full bg-emerald-600/10 blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[40vw] w-[40vw] max-h-[500px] max-w-[500px] rounded-full bg-cyan-600/10 blur-[140px]" />
                <div className="absolute left-1/2 top-[20%] h-[30vw] w-[30vw] -translate-x-1/2 rounded-full bg-emerald-400/5 blur-[120px]" />
            </div>

            <Navbar />

            <div className="relative z-10 pt-24 sm:pt-28">
                <Hero />

                <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
                    <section id="projects" className="scroll-mt-28">
                        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Projects</span>
                        </h2>
                        <ProjectList />
                    </section>

                    <div className="mt-16 grid gap-8 xl:mt-24 xl:grid-cols-2 xl:gap-10">
                        <section id="create" className="scroll-mt-28">
                            <div className="mb-6 flex items-center gap-3">
                                <span className="h-6 w-1 rounded-full bg-emerald-500"></span>
                                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                                    Start a New Project
                                </h2>
                            </div>
                            <CreateProjectForm />
                        </section>

                        <section id="verify" className="scroll-mt-28">
                            <div className="mb-6 flex items-center gap-3">
                                <span className="h-6 w-1 rounded-full bg-cyan-500"></span>
                                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                                    Submit Proof of Impact
                                </h2>
                            </div>
                            <VerificationForm />
                        </section>
                    </div>
                </div>

                <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-gray-500 sm:mt-16 sm:py-8 sm:text-sm">
                    <p>Built for Starknet Re{"{define}"} Hackathon • Trust-Minimized Funding Protocol</p>
                </footer>
            </div>
        </main>
    );
}
