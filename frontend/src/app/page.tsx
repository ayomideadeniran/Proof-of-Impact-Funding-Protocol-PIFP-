import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProjectList from "@/components/ProjectList";
import CreateProjectForm from "@/components/CreateProjectForm";
import VerificationForm from "@/components/VerificationForm";

export default function Home() {
    return (
        <main className="relative min-h-screen overflow-x-hidden bg-[#05090f] text-white">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-8%] left-[-18%] h-[45vw] w-[45vw] max-h-[520px] max-w-[520px] rounded-full bg-cyan-700/16 blur-[130px]" />
                <div className="absolute bottom-[-14%] right-[-18%] h-[45vw] w-[45vw] max-h-[520px] max-w-[520px] rounded-full bg-emerald-700/14 blur-[130px]" />
                <div className="absolute left-1/2 top-[18%] h-[28vw] w-[28vw] -translate-x-1/2 rounded-full bg-blue-700/10 blur-[120px]" />
            </div>

            <Navbar />

            <div className="relative z-10 pt-24 sm:pt-28">
                <Hero />

                <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
                    <section id="projects" className="scroll-mt-28">
                        <h2 className="mb-6 bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-center text-2xl font-bold text-transparent sm:mb-8 sm:text-3xl">
                            Featured Projects
                        </h2>
                        <ProjectList />
                    </section>

                    <div className="mt-12 grid gap-8 xl:mt-16 xl:grid-cols-2 xl:gap-10">
                        <section id="create" className="scroll-mt-28">
                            <h2 className="mb-4 border-l-4 border-teal-500 pl-4 text-xl font-bold text-teal-300 sm:mb-6 sm:text-2xl">
                                Start a New Project
                            </h2>
                            <CreateProjectForm />
                        </section>

                        <section id="verify" className="scroll-mt-28">
                            <h2 className="mb-4 border-l-4 border-cyan-500 pl-4 text-xl font-bold text-cyan-300 sm:mb-6 sm:text-2xl">
                                Submit Proof of Impact
                            </h2>
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
