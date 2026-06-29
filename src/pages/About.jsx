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
                            Palladio is a web-based architectural design platform that uses AI to generate floor plans, 3D models, and property visualizations. Named after Italian Renaissance architect Andrea Palladio, the platform applies his principles of proportion and symmetry through modern machine learning technology.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Core features include: text-to-floorplan generation that creates editable layouts from descriptions like "3-bedroom house with open kitchen"; sketch-to-plan conversion that cleans up hand-drawn floor plans; 2D-to-3D model conversion using Hi3D and SmplrSpace AI engines; architectural rendering with customizable lighting and materials; cost estimation using location-specific material rate databases; and property assessment tools for real estate analysis. All generated assets can be saved to projects and exported for use in CAD software or client presentations.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            The platform operates on a token-based system where AI generations consume tokens based on complexity. Users can access free tiers for basic features or purchase token packs and subscriptions for unlimited usage. Projects are stored in the cloud with version history, and assets can be organized by type (plans, renders, documents) with custom descriptions for team collaboration.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <Users className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Who is Palladio For?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio is built for practicing architects who need to produce client-ready floor plans in hours instead of days, interior designers generating 3D visualizations for renovation proposals, and real estate developers creating marketing materials for unbuilt properties. Architecture students use it to iterate on design concepts during studio courses, while small firms (1-10 people) access enterprise-level visualization without hiring dedicated 3D artists.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Specific use cases include: contractors generating as-built documentation from site photos, property assessors creating standardized floor plan records for valuations, facility managers documenting space layouts for lease agreements, and heritage consultants producing measured drawings of historical structures. Urban planners use it to visualize zoning proposals, while exhibition designers prototype gallery layouts before installation.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            The platform supports individual accounts with personal token allocations and team workflows where project assets are shared across collaborators. Subscription tiers scale from occasional users (monthly plans) to high-volume practices (annual unlimited), with admin dashboards for tracking team usage and managing project access.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <Sparkles className="text-violet-400 mt-1" size={24} />
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Who Builds Palladio?</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Palladio is developed by a team of licensed architects, computer vision engineers, and full-stack developers based in Australia. The founding team includes architects who previously worked at firms handling residential and commercial projects, bringing firsthand experience with the time pressures and client communication challenges the platform addresses.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            Technical development leverages multiple AI APIs (Hi3D, SmplrSpace) for 3D generation, combined with custom machine learning models for floorplan interpretation. The engineering team specializes in React-based frontend development, Deno backend services, and integration with third-party services like Stripe for payments and Google Drive for asset storage. All features are tested with practicing architects before release, and the product roadmap prioritizes workflow efficiency over feature quantity.
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-4">
                            The platform is built on the Base44 infrastructure, which provides authentication, database management, and webhook handling. This architecture allows the team to focus on domain-specific features rather than backend maintenance. Development follows an iterative approach with regular updates based on user feedback collected through in-app analytics and direct customer support channels.
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