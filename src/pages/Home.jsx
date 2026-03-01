import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileSearch, Layers, Building2, MapPin, ClipboardList, ChevronRight, Code, Ruler, Mail } from 'lucide-react';

const services = [
  {
    id: 'assess', title: 'Assess Architectural Plans',
    description: 'Upload floorplans, site plans or construction drawings for AI-powered assessment and detailed analysis.',
    icon: FileSearch, iconBg: '#0d6e6e', page: null
  },
  {
    id: 'generate', title: 'Generate Floorplans',
    description: 'Describe your requirements and let AI generate detailed, scaled floorplans for any space.',
    icon: Layers, iconBg: '#5b21b6', page: null
  },
  {
    id: 'render', title: '3D Renders from Sketches',
    description: 'Upload a black & white 3D view and receive photorealistic AI-rendered architectural visuals.',
    icon: Building2, iconBg: '#b45309', page: 'Render3D'
  },
  {
    id: 'property', title: 'Property Intelligence',
    description: 'Enter any address to retrieve zoning info, land details, overlays, planning history and more.',
    icon: MapPin, iconBg: '#15803d', page: null
  },
  {
    id: 'town', title: 'Town Planner AI',
    description: 'Assess proposed developments against local planning schemes, zoning codes and regulations.',
    icon: ClipboardList, iconBg: '#9d174d', page: null
  },
];

function PalladioLogo() {
  return (
    <div className="relative mx-auto my-6" style={{ width: '210px', height: '210px' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '3px solid #14b8a6',
        boxShadow: '0 0 50px rgba(20,184,166,0.45), 0 0 100px rgba(20,184,166,0.15)'
      }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', backgroundColor: '#0f172a' }} />
      {/* Cross dividers */}
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: '#1e293b' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', backgroundColor: '#1e293b' }} />
      </div>
      {/* Q1: Code top-left */}
      <div style={{ position: 'absolute', top: '36px', left: '36px', color: '#14b8a6' }}>
        <Code size={16} />
        <div style={{ width: '18px', height: '1.5px', backgroundColor: '#14b8a6', marginTop: '3px', marginBottom: '2px' }} />
        <div style={{ width: '12px', height: '1.5px', backgroundColor: '#14b8a6' }} />
      </div>
      {/* Q2: Ruler top-right */}
      <div style={{ position: 'absolute', top: '36px', right: '36px', color: '#94a3b8' }}>
        <Ruler size={16} />
      </div>
      {/* Q3: Mail bottom-left */}
      <div style={{ position: 'absolute', bottom: '36px', left: '36px', color: '#94a3b8' }}>
        <Mail size={16} />
      </div>
      {/* Q4: Building bottom-right */}
      <div style={{ position: 'absolute', bottom: '36px', right: '36px', color: '#94a3b8' }}>
        <Building2 size={16} />
      </div>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 10
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px' }}>Palladio AI</span>
        <span style={{ color: '#64748b', fontSize: '8px', textAlign: 'center', marginTop: '5px', paddingLeft: '16px', paddingRight: '16px', lineHeight: '1.4' }}>
          Automate. Design. Connect. Build.
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="px-4 py-6">
      <PalladioLogo />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-3">
          Your AI-Powered{' '}
          <span style={{ color: '#14b8a6' }}>Architecture</span>
          {' '}Suite
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          From assessing existing plans to generating new designs, rendering concepts and navigating planning
          regulations — Palladio AI is your intelligent architectural partner.
        </p>
      </div>

      <div className="space-y-3">
        {services.map(({ id, title, description, icon: Icon, iconBg, page }) => {
          const cardContent = (
            <div
              className="flex items-center gap-4 p-4 rounded-2xl transition-opacity hover:opacity-85"
              style={{ backgroundColor: '#13131f' }}
            >
              <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: '52px', height: '52px', backgroundColor: iconBg }}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm">{title}</h3>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: '#64748b' }}>{description}</p>
              </div>
              <ChevronRight size={18} className="shrink-0" style={{ color: '#475569' }} />
            </div>
          );

          return page ? (
            <Link key={id} to={createPageUrl(page)} style={{ textDecoration: 'none', display: 'block' }}>
              {cardContent}
            </Link>
          ) : (
            <div key={id}>{cardContent}</div>
          );
        })}
      </div>
    </div>
  );
}