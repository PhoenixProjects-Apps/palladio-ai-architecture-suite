import React from 'react';

export default function ArchiSketch() {
  return (
    <div className="h-[calc(100vh-80px)] w-full p-4">
      <iframe
        src="https://archistroke-design-flow.base44.app"
        title="ArchiSketch"
        className="w-full h-full rounded-2xl border border-white/10 bg-[#0f1117]"
        allow="fullscreen"
      />
    </div>
  );
}