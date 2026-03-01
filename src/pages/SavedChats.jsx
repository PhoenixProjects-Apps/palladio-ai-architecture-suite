import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function SavedChats() {
  return (
    <div className="p-6 pb-12 min-h-screen bg-[#0f1117]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <MessageSquare className="text-amber-500" size={28} />
          Saved Chats
        </h1>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
          <MessageSquare className="w-16 h-16 text-slate-500 mx-auto mb-6 opacity-40" />
          <h2 className="text-2xl font-semibold text-white mb-3">No saved chats yet</h2>
          <p className="text-slate-400 max-w-sm mx-auto">Your AI conversation history, assessments, and planning discussions will appear here.</p>
        </div>
      </div>
    </div>
  );
}