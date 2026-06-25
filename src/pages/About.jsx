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
                            Palladio is an advanced AI-powered architectural design platform that transforms the way architects, designers, and property professionals create and visualize spaces. Named after the renowned Italian Renaissance architect Andrea Palladio, whose principles of symmetry, proportion, and classical beauty revolutionized building design, our platform carries forward that legacy of innovation through modern technology.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Our cutting-edge technology combines artificial intelligence with architectural expertise to generate floor plans from text descriptions, convert 2D images into 3D models, produce stunning architectural renders, and provide comprehensive property analysis tools. We offer specialized features including AI-driven floorplan generation from natural language prompts, professional sketch-to-plan conversion, 3D model creation from 2D images using multiple AI engines, cost estimation based on regional material databases, and property assessment tools for real estate professionals.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Whether you're sketching initial concepts or finalizing detailed plans, Palladio accelerates your workflow while maintaining professional quality. Our platform integrates seamlessly into existing design processes, allowing you to iterate faster, communicate more effectively with clients, and explore more design options in less time. From residential renovations to commercial developments, Palladio provides the tools you need to bring your architectural visions to life with unprecedented speed and precision.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <Users className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Who is Palladio For?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio serves architects, interior designers, real estate developers, property assessors, and construction professionals who need rapid, high-quality design visualization. It's perfect for architecture students exploring design concepts, small firms seeking enterprise-level tools without enterprise costs, and property professionals who need to communicate spatial ideas clearly to clients.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Our platform is designed for urban planners visualizing development proposals, contractors estimating renovation costs, facility managers documenting existing spaces, and educators teaching architectural principles. We support landscape architects creating outdoor environments, heritage consultants documenting historical buildings, and exhibition designers planning immersive experiences.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Our platform scales from individual practitioners to growing teams, providing the flexibility and power needed at every stage of your professional journey. Whether you're a solo practitioner managing multiple residential projects, a mid-size firm handling commercial developments, or an enterprise organization coordinating complex multi-site initiatives, Palladio adapts to your workflow and grows with your needs.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <Sparkles className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Who Builds Palladio?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio is built by a passionate team of architects, engineers, and AI specialists who understand the challenges of modern architectural practice. We combine decades of industry experience with cutting-edge machine learning to create tools that actually work the way professionals think. Our development is driven by real feedback from practicing architects and designers, ensuring every feature solves genuine problems rather than adding unnecessary complexity.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Our team includes licensed architects who have worked on projects ranging from residential renovations to large-scale urban developments, software engineers with backgrounds in computer vision and generative AI, and user experience designers who specialize in complex professional tools. We partner with leading research institutions to stay at the forefront of AI-driven design technology, and we actively contribute to open-source projects that benefit the broader architectural community.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            We're committed to making architectural design more accessible, efficient, and creative for everyone. Our mission is to democratize high-quality design tools, reduce the time spent on repetitive tasks, and empower creators to focus on what matters most: designing spaces that improve people's lives. We believe technology should amplify human creativity, not replace it, and every feature we build reflects that principle.
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