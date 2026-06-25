import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            await fetch('mailto:hello@palladio.ai', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            toast.success('Message sent! We\'ll get back to you soon.');
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            window.location.href = `mailto:hello@palladio.ai?subject=Contact from ${formData.name}&body=${encodeURIComponent(formData.message + '\n\nFrom: ' + formData.email)}`;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-white mb-8">Contact Us</h1>
            
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-semibold text-white mb-4">Get in Touch</h2>
                    <p className="text-slate-300 leading-relaxed">
                        Have questions about Palladio? Need help with your project? We're here to assist you with anything you need.
                    </p>
                    
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-3">
                            <Mail className="text-violet-400" size={20} />
                            <a href="mailto:hello@palladio.ai" className="text-slate-300 hover:text-violet-400 transition-colors">
                                hello@palladio.ai
                            </a>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <MessageSquare className="text-violet-400" size={20} />
                            <span className="text-slate-300">Response within 24 hours</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <h2 className="text-2xl font-semibold text-white mb-4">Send a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">Name</label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Your name"
                                className="bg-slate-900 border-white/10 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">Email</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="your@email.com"
                                className="bg-slate-900 border-white/10 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-400 mb-2 block">Message</label>
                            <Textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="How can we help?"
                                className="bg-slate-900 border-white/10 text-white min-h-[120px]"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl"
                        >
                            {isSubmitting ? 'Sending...' : <><Send size={18} className="mr-2" /> Send Message</>}
                        </Button>
                    </form>
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