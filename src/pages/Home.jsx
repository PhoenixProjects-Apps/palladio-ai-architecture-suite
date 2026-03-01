import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileImage, Layers, Building2, MapPin, ClipboardList, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const tools = [
  { id: 'assess', title: 'Assess Plans', desc: 'AI-powered assessment and detailed analysis of floorplans.', icon: FileImage, color: 'from-cyan-500 to-cyan-700', page: 'PalladioAssess' },
  { id: 'floorplan', title: 'Generate Floorplans', desc: 'AI generated detailed, scaled floorplans for any space.', icon: Layers, color: 'from-violet-500 to-violet-700', page: 'PalladioFloorplan' },
  { id: 'render', title: '3D Renders', desc: 'Photorealistic AI-rendered architectural visuals from sketches.', icon: Building2, color: 'from-amber-500 to-amber-700', page: 'Render3D' },
  { id: 'property', title: 'Property Intelligence', desc: 'Retrieve zoning info, land details, planning history and more.', icon: MapPin, color: 'from-emerald-500 to-emerald-700', page: 'PalladioProperty' },
  { id: 'planner', title: 'Town Planner AI', desc: 'Assess developments against local planning schemes and codes.', icon: ClipboardList, color: 'from-rose-500 to-rose-700', page: 'PalladioPlanner' },
];

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) setUser(u);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-12">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69997bf8be3f3bf35cbd8147/e93fde36f_Lumii_20260222_021318181.png" alt="Palladio AI" className="w-[60px] h-[60px] object-cover rounded-xl" />
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('PalladioPricing')} className="text-sm font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition">
              Pricing
            </Link>
            {user && (
              <Link to={createPageUrl('UserProfile')} className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold hover:opacity-80 transition shadow-lg border border-white/10">
                {user.full_name?.charAt(0) || <User size={18} />}
              </Link>
            )}
          </div>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Your AI-Powered Architecture Suite</h1>
          <p className="text-slate-400 text-lg uppercase tracking-widest text-sm font-medium">Automate. Design. Connect. Build.</p>
        </motion.div>

        <div className="grid gap-4">
          {tools.map((tool, i) => (
            <motion.div 
              key={tool.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={createPageUrl(tool.page)} className="block group">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-5 hover:bg-white/10 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    <tool.icon size={26} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{tool.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{tool.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}