import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Sparkles } from 'lucide-react';

export default function About() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-white mb-8">About Palladio</h1>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="flex items-start gap-4">
                    <Building2 className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">What is Palladio?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio is an advanced AI-powered architectural design platform that transforms the way architects, designers, and property professionals create and visualize spaces. Our cutting-edge technology combines artificial intelligence with architectural expertise to generate floor plans from text descriptions, convert 2D images into 3D models, produce stunning architectural renders, and provide comprehensive property analysis tools. Whether you're sketching initial concepts or finalizing detailed plans, Palladio accelerates your workflow while maintaining professional quality.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <Users className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Who is Palladio For?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio serves architects, interior designers, real estate developers, property assessors, and construction professionals who need rapid, high-quality design visualization. It's perfect for architecture students exploring design concepts, small firms seeking enterprise-level tools without enterprise costs, and property professionals who need to communicate spatial ideas clearly to clients. Our platform scales from individual practitioners to growing teams, providing the flexibility and power needed at every stage of your professional journey.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <Sparkles className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Who Builds Palladio?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio is built by a passionate team of architects, engineers, and AI specialists who understand the challenges of modern architectural practice. We combine decades of industry experience with cutting-edge machine learning to create tools that actually work the way professionals think. Our development is driven by real feedback from practicing architects and designers, ensuring every feature solves genuine problems rather than adding unnecessary complexity. We're committed to making architectural design more accessible, efficient, and creative for everyone.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Link to="/" className="text-violet-400 hover:text-violet-300 text-sm">
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}