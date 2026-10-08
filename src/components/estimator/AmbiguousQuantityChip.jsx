import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Amber chip shown next to a quantity field the AI could not confidently
// classify as existing or new (it defaulted the value to NEW work).
export default React.memo(function AmbiguousQuantityChip({ note }) {
  if (!note) return null;
  return (
    <span
      title={note}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-medium border border-amber-500/30 whitespace-nowrap"
    >
      <AlertTriangle size={10} className="shrink-0" aria-hidden="true" />
      Check: could not confirm existing vs new
    </span>
  );
});