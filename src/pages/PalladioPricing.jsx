import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PalladioPricing() {
    const [inIframe, setInIframe] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        try {
            setInIframe(window.self !== window.top);
        } catch (e) {
            setInIframe(true);
        }
    }, []);

    const features = [
        "Unlimited Plan Assessments",
        "AI Floorplan Generation",
        "3D Photorealistic Renders",
        "Property Intelligence Lookups",
        "Town Planner AI Analysis",
        "DXF CAD Exports",
        "Priority Support"
    ];

    const handleSubscribe = async (priceId, planType) => {
        if (inIframe) {
            window.open(window.location.href, '_blank');
            return;
        }
        
        try {
            setLoading(true);
            const { data } = await base44.functions.invoke('createCheckoutSession', {
                priceId,
                planType
            });
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error) {
            console.error("Error creating checkout session:", error);
            toast.error("Failed to start checkout. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" className="hover:bg-slate-200 text-slate-600 rounded-full">
                            <ArrowLeft size={20} className="mr-2" /> Back to Suite
                        </Button>
                    </Link>
                </header>

                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold mb-4 text-slate-900">Simple, transparent pricing</h1>
                    <p className="text-slate-500 text-lg">Unlock the full power of Palladio AI architecture suite.</p>
                </div>

                {inIframe && (
                    <Alert className="max-w-2xl mx-auto mb-8 bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Checkout disabled in preview</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            You are viewing this in an iframe. To complete checkout, please open this app in a new tab.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Monthly */}
                    <div className="border border-slate-200 rounded-3xl p-8 bg-white shadow-lg relative flex flex-col hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-8 -translate-y-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wider">
                            POPULAR
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">Palladio Monthly</h3>
                        <p className="text-slate-500 mb-6">Flexibility for ongoing projects.</p>
                        <div className="mb-8">
                            <span className="text-5xl font-bold">$49.00</span>
                            <span className="text-slate-500">/month</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-1">
                            {features.map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-600">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Check size={12} />
                                    </div>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Button 
                            onClick={() => handleSubscribe('price_1TIXlVI97AS5ZzLyb0soASiJ', 'palladio_monthly')}
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl text-lg shadow-md"
                        >
                            {loading ? "Loading..." : "Subscribe Monthly"}
                        </Button>
                    </div>

                    {/* Annual */}
                    <div className="border-2 border-cyan-500 rounded-3xl p-8 bg-cyan-50/30 relative flex flex-col hover:-translate-y-1 transition-transform shadow-xl">
                        <h3 className="text-2xl font-semibold mb-2">Palladio Annual</h3>
                        <p className="text-slate-500 mb-6">Best value for professionals.</p>
                        <div className="mb-8">
                            <span className="text-5xl font-bold">$470.00</span>
                            <span className="text-slate-500">/year</span>
                        </div>
                        <p className="text-cyan-700 font-medium mb-6 bg-cyan-100 inline-block px-3 py-1 rounded-md text-sm self-start">
                            Saves $118 per year
                        </p>
                        <ul className="space-y-4 mb-8 flex-1">
                            {features.map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-600">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Check size={12} />
                                    </div>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Button 
                            onClick={() => handleSubscribe('price_1TIXlVI97AS5ZzLyj6yPvWK1', 'palladio_annual')}
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-xl text-lg shadow-lg shadow-cyan-500/20"
                        >
                            {loading ? "Loading..." : "Subscribe Annually"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}