import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Information We Collect",
      body: [
        "Account information you provide when you sign up, such as your name, email address, and profile details.",
        "Project data you create or upload, including floorplans, renders, sketches, property details, and saved files.",
        "Payment information processed securely through our payment provider (Stripe). We do not store full card details on our servers.",
        "Usage data such as how you interact with the app, device information, and log data."
      ]
    },
    {
      title: "2. How We Use Your Information",
      body: [
        "To provide, operate, and maintain the Palladio AI tools and features.",
        "To process transactions and manage your subscription or token balance.",
        "To generate AI-driven outputs such as floorplans, renders, and plan assessments.",
        "To send notifications about your projects, account, and service updates.",
        "To improve our services, troubleshoot issues, and develop new features."
      ]
    },
    {
      title: "3. How We Share Your Information",
      body: [
        "We do not sell your personal information.",
        "We share data with trusted service providers who help us operate the app (e.g. payment processing, file storage, and AI generation services), only as necessary to deliver the features you use.",
        "We may disclose information when required by law or to protect our rights and the safety of others."
      ]
    },
    {
      title: "4. Data Security",
      body: [
        "We use reasonable technical and organisational measures to protect your information.",
        "Payment transactions are encrypted and handled by Stripe, a PCI-compliant provider.",
        "No method of transmission over the internet is fully secure, so we cannot guarantee absolute security."
      ]
    },
    {
      title: "5. Data Retention",
      body: [
        "We retain your account and project data for as long as your account is active or as needed to provide the service.",
        "You may request deletion of your account and associated data at any time by contacting us."
      ]
    },
    {
      title: "6. Your Rights",
      body: [
        "You can access, update, or delete your personal information through your account settings.",
        "You may request a copy of your data or ask us to restrict or stop certain processing.",
        "Where applicable, you have the right to data portability and to withdraw consent at any time."
      ]
    },
    {
      title: "7. Third-Party Links & Services",
      body: [
        "Our app may link to or integrate with third-party services. We are not responsible for the privacy practices of those external services.",
        "AI generation relies on third-party models; avoid submitting sensitive or confidential information you do not want processed externally."
      ]
    },
    {
      title: "8. Children's Privacy",
      body: [
        "Palladio AI is not intended for children under 13 (or the minimum age in your jurisdiction).",
        "We do not knowingly collect personal information from children. If you believe a child has provided us data, please contact us to remove it."
      ]
    },
    {
      title: "9. Changes to This Policy",
      body: [
        "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated policy in the app.",
        "Continued use of the app after changes constitutes acceptance of the revised policy."
      ]
    },
    {
      title: "10. Contact Us",
      body: [
        "If you have questions about this Privacy Policy or your personal data, please contact us through the Contact page in the app."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <ShieldCheck className="text-amber-500" size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Last updated: 28 June 2026</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8">
          <p className="text-slate-300 leading-relaxed">
            Palladio AI ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our architecture and design platform ("the App"). By using the App, you agree to the practices described below.
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