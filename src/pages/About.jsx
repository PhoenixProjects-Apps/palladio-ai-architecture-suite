import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Sparkles, Target, Layers } from 'lucide-react';

export default function About() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">About Us</h1>
            
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-8">
                
                {/* Intro Section */}
                <div className="flex items-start gap-4">
                    <Building2 className="text-violet-600 dark:text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Welcome to Palladio AI</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                            Welcome to Palladio AI, your ultimate AI-powered architecture suite.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                            At Palladio AI, we believe that the future of design and development lies at the intersection of human creativity and artificial intelligence. Our platform was built to transform how architects, urban planners, builders, and property developers approach their projects—taking you from initial concept to actionable data in record time.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Our guiding philosophy is simple: <strong className="text-slate-900 dark:text-white">Automate. Design. Connect. Build.</strong> We empower industry professionals to focus on what they do best by handling the heavy lifting of spatial analysis, cost estimation, and local compliance through advanced AI.
                        </p>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-white/10"></div>

                {/* Mission Section */}
                <div className="flex items-start gap-4">
                    <Target className="text-violet-600 dark:text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Our Mission</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Our mission is to democratize and streamline the architectural and planning process. By providing an all-in-one, intelligent toolkit, we aim to eliminate the friction in property development, drastically reduce turnaround times, and provide unprecedented accuracy in planning and estimating.
                        </p>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-white/10"></div>

                {/* What We Do Section */}
                <div className="flex items-start gap-4">
                    <Layers className="text-violet-600 dark:text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">What We Do</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                            Palladio AI is a comprehensive suite of tools designed to cover every angle of the architectural workflow. Our cutting-edge features include:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1">Generate Floorplans</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Say goodbye to starting from scratch. Our AI generates detailed, perfectly scaled floorplans tailored to any spatial requirement.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1">3D Renders</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Bring your visions to life. We turn basic sketches and 2D concepts into photorealistic, breathtaking architectural visuals instantly.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1">Assess Plans</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Leverage AI-powered assessment for deep, detailed analysis of existing floorplans to maximize utility, flow, and design efficiency.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1">Town Planner AI</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Navigate red tape with ease. Our AI instantly assesses your development plans against local planning schemes, zoning laws, and building codes.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1">Property Intelligence</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Make informed decisions by retrieving crucial zoning information, land details, and rich planning history for any property in seconds.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-1">Cost Estimator</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Keep your budget in check with AI-driven material takeoffs and cost estimations powered by live, localized data.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-white/10"></div>

                {/* Who We Serve Section */}
                <div className="flex items-start gap-4">
                    <Users className="text-violet-600 dark:text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Who We Serve</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Whether you are a solo architect sketching your next masterpiece, a developer evaluating a new land acquisition, or a builder trying to get an accurate material takeoff, Palladio AI is built for you. We provide the tools to give you a competitive edge, saving you hours of manual research, drafting, and calculating.
                        </p>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-white/10"></div>

                {/* Why Palladio AI Section */}
                <div className="flex items-start gap-4">
                    <Sparkles className="text-violet-600 dark:text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Why Palladio AI?</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                            We named our suite in honor of the great classical architects because we respect the foundations of design—but we are entirely focused on its future. By centralizing floorplan generation, 3D rendering, local compliance, and cost estimation into one intuitive dashboard, Palladio AI removes the silos that slow down development.
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold italic dark:text-violet-300 mb-4">
                            Automate the mundane. Design the extraordinary. Connect the data. Build the future.
                        </p>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                            Join us in revolutionizing the built environment. Welcome to Palladio AI.
                        </p>
                    </div>
                </div>

            </div>

            <div className="mt-8 text-center">
                <Link to="/" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 text-sm font-medium">
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}