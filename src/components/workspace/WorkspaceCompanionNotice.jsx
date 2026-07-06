import React from 'react';

export default function WorkspaceCompanionNotice({ icon: Icon, eyebrow, title, description, features = [], children }) {
  return (
    <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 shadow-xl shadow-cyan-950/20 overflow-hidden">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0">
            <Icon size={22} className="text-cyan-300" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1">{eyebrow}</p>}
          <h2 className="text-lg font-bold text-white leading-tight">{title}</h2>
          <p className="text-sm leading-relaxed text-slate-300 mt-2">{description}</p>
        </div>
      </div>
      {features.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="text-cyan-300 mt-0.5">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}