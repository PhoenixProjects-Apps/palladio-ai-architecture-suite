import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
  const navigate = useNavigate();
  const sections = [
    {
      title: "1. Acceptance of Terms",
      body: [
        "By accessing or using Palladio AI (\"the App\", \"we\", \"us\", or \"our\"), you agree to be bound by these Terms of Service (\"Terms\").",
        "If you do not agree to these Terms, you must not access or use the App."
      ]
    },
    {
      title: "2. Description of Service",
      body: [
        "Palladio AI provides AI-assisted architecture and design tools, including floorplan generation, 3D rendering, plan assessment, property intelligence, and cost estimation.",
        "We reserve the right to modify, suspend, or discontinue any feature at any time without notice."
      ]
    },
    {
      title: "3. Eligibility",
      body: [
        "You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the App.",
        "By using the App, you represent that you have the legal capacity to enter into these Terms."
      ]
    },
    {
      title: "4. Accounts",
      body: [
        "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
        "You agree to provide accurate information and to keep your account details up to date.",
        "You are responsible for notifying us of any unauthorised use of your account."
      ]
    },
    {
      title: "5. Subscriptions and Payments",
      body: [
        "Some features require a paid subscription or one-time token purchases. Fees are billed in advance through our payment provider (Stripe).",
        "Subscriptions automatically renew unless cancelled before the end of the billing period.",
        "You may manage or cancel your subscription at any time through the billing portal.",
        "Refunds, where applicable, are handled at our discretion in accordance with applicable law."
      ]
    },
    {
      title: "6. Acceptable Use",
      body: [
        "You agree not to misuse the App, including attempting to disrupt service, reverse engineer, scrape data, or introduce malicious code.",
        "You must not use the App to generate content that is unlawful, infringing, defamatory, or harmful.",
        "Automated or bulk access without our permission is prohibited."
      ]
    },
    {
      title: "7. User Content",
      body: [
        "You retain ownership of content you upload or create. By using the App, you grant us a limited licence to process your content solely to provide the requested features.",
        "You are responsible for ensuring you have the rights to any content you upload.",
        "AI-generated outputs are provided as tools to assist you; you are responsible for reviewing and verifying all results before relying on them."
      ]
    },
    {
      title: "8. Intellectual Property",
      body: [
        "The App, its design, branding, and underlying software are owned by Palladio AI and protected by intellectual property laws.",
        "You may not copy, modify, or distribute any part of the App without our permission."
      ]
    },
    {
      title: "9. Disclaimers",
      body: [
        "The App and all AI-generated outputs are provided \"as is\" without warranties of any kind.",
        "We do not guarantee that outputs will be accurate, complete, or suitable for any particular purpose, including construction or regulatory compliance.",
        "You should consult qualified professionals before making decisions based on App outputs."
      ]
    },
    {
      title: "10. Limitation of Liability",
      body: [
        "To the fullest extent permitted by law, Palladio AI shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.",
        "Our total liability for any claim is limited to the amount you paid us in the preceding 12 months."
      ]
    },
    {
      title: "11. Indemnification",
      body: [
        "You agree to indemnify and hold us harmless from claims, damages, or expenses arising from your use of the App or your violation of these Terms."
      ]
    },
    {
      title: "12. Termination",
      body: [
        "We may suspend or terminate your access at any time, with or without cause or notice.",
        "Upon termination, your right to use the App ceases immediately. Sections that by their nature should survive will remain in effect."
      ]
    },
    {
      title: "13. Changes to These Terms",
      body: [
        "We may update these Terms from time to time. We will notify you of significant changes by posting the updated Terms in the App.",
        "Continued use of the App after changes constitutes acceptance of the revised Terms."
      ]
    },
    {
      title: "14. Governing Law",
      body: [
        "These Terms are governed by the laws of the jurisdiction in which Palladio AI operates, without regard to conflict of law principles."
      ]
    },
    {
      title: "15. Contact Us",
      body: [
        "If you have questions about these Terms, please contact us through the Contact page in the app."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6 hover:bg-white/10 text-slate-400 hover:text-white px-0"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <FileText className="text-amber-500" size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
            <p className="text-sm text-slate-400">Last updated: 28 June 2026</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8">
          <p className="text-slate-300 leading-relaxed">
            Welcome to Palladio AI. These Terms of Service govern your use of our architecture and design platform. Please read them carefully before using the App.
          </p>

          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
              <ul className="space-y-2 list-disc pl-5 text-slate-300 text-sm leading-relaxed">
                {section.body.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          © 2026 Palladio AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}