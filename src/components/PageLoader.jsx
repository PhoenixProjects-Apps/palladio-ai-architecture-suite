import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader({ label = "Loading..." }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-muted-foreground animate-in fade-in duration-500">
      <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}