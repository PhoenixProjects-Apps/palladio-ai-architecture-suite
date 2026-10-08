import React from 'react';
import { FIELD_LABELS, sumDemolitionArea } from '@/lib/estimator/extraction';

const round1 = (v) => Math.round((v || 0) * 10) / 10;

// Read-only reference rows for existing-retained and demolished quantities.
// These never feed the estimate's new-work lines; the demolished total only
// feeds the Demolition & Spoil Removal line item.
export default React.memo(function ExtractionReferenceRows({ fields, projectType }) {
  if (projectType === 'New Build' || !fields) return null;
  const rows = Object.entries(fields).filter(
    ([, f]) => (f.existingRetained || 0) > 0 || (f.demolished || 0) > 0
  );
  if (rows.length === 0) return null;
  const demoTotal = sumDemolitionArea(fields);
  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-2">
      <p className="text-xs font-semibold text-slate-300">Existing &amp; Demolished (reference — excluded from estimate)</p>
      <div className="space-y-1">
        {rows.map(([key, f]) => (
          <div key={key} className="flex flex-wrap items-baseline gap-x-3 text-xs">
            <span className="text-slate-300 min-w-24">{FIELD_LABELS[key] || key}</span>
            {(f.existingRetained || 0) > 0 && (
              <span className="text-slate-400">existing retained {round1(f.existingRetained)} {f.unit || 'm²'}</span>
            )}
            {(f.demolished || 0) > 0 && (
              <span className="text-amber-400/90">demolished {round1(f.demolished)} {f.unit || 'm²'}</span>
            )}
          </div>
        ))}
      </div>
      {demoTotal > 0 && (
        <p className="text-xs text-amber-400/90">
          Demolished total {round1(demoTotal)} m² feeds the Demolition &amp; Spoil Removal line item.
        </p>
      )}
    </div>
  );
});