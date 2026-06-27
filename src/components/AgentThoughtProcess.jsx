import React, { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Wrench, Brain } from 'lucide-react';

const statusConfig = {
  pending: { Icon: Loader2, className: 'animate-spin text-slate-400', label: 'Queued' },
  running: { Icon: Loader2, className: 'animate-spin text-cyan-400', label: 'Running' },
  in_progress: { Icon: Loader2, className: 'animate-spin text-cyan-400', label: 'In progress' },
  completed: { Icon: CheckCircle2, className: 'text-emerald-400', label: 'Completed' },
  success: { Icon: CheckCircle2, className: 'text-emerald-400', label: 'Done' },
  failed: { Icon: XCircle, className: 'text-red-400', label: 'Failed' },
  error: { Icon: XCircle, className: 'text-red-400', label: 'Error' },
};

function ToolCallDisplay({ toolCall, idx }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || 'pending';
  const cfg = statusConfig[status] || statusConfig.pending;
  const failed = ['failed', 'error'].includes(status);
  const name = toolCall.name || `Tool ${idx + 1}`;
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  let args = toolCall.arguments_string;
  try { if (typeof args === 'string') args = JSON.parse(args); } catch (_) {}
  let results = toolCall.results;
  try { if (typeof results === 'string') results = JSON.parse(results); } catch (_) {}

  const label = failed
    ? (proj.error_label || cfg.label)
    : (status === 'success' || status === 'completed' ? (proj.label || cfg.label) : (proj.active_label || cfg.label));

  return (
    <div className="border border-white/10 rounded-lg bg-white/[0.02]">
      <button
        onClick={() => !hideDetails && setExpanded((e) => !e)}
        className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm ${hideDetails ? 'cursor-default' : ''}`}
      >
        <cfg.Icon size={14} className={cfg.className} />
        <Wrench size={12} className="text-slate-500" />
        <span className="text-slate-200 font-medium">{name}</span>
        <span className={`text-xs ${failed ? 'text-red-400' : 'text-slate-500'}`}>{label}</span>
        {!hideDetails && (
          <span className="ml-auto text-slate-500">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        )}
      </button>
      {!hideDetails && expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {args != null && (
            <div>
              <div className="text-slate-500 mb-1">Parameters</div>
              <pre className="bg-black/30 rounded p-2 overflow-x-auto text-slate-300 whitespace-pre-wrap break-words">{JSON.stringify(args, null, 2)}</pre>
            </div>
          )}
          {results != null && (
            <div>
              <div className="text-slate-500 mb-1">Result</div>
              <pre className={`bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words ${failed ? 'text-red-300' : 'text-slate-300'}`}>{typeof results === 'string' ? results : JSON.stringify(results, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentThoughtProcess({ messages }) {
  const msgs = messages || [];
  const toolCalls = [];
  const reasoningSnippets = [];
  msgs.forEach((m) => {
    if (m.role === 'assistant') {
      (m.tool_calls || []).forEach((tc) => toolCalls.push(tc));
      if (m.reasoning?.content) reasoningSnippets.push(m.reasoning.content);
    }
  });

  const last = msgs[msgs.length - 1];
  const stillWorking = !last || last.role !== 'assistant' || !last.content ||
    (last.tool_calls || []).some((tc) => ['pending', 'running', 'in_progress'].includes(tc.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
        {stillWorking ? (
          <><Loader2 size={16} className="animate-spin" /> Agent is analysing your plan…</>
        ) : (
          <><CheckCircle2 size={16} /> Agent finished reasoning</>
        )}
      </div>

      {reasoningSnippets.length > 0 && (
        <div className="border border-white/10 rounded-lg bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Brain size={12} /> Reasoning
          </div>
          <p className="text-xs text-slate-300 max-h-32 overflow-y-auto">{reasoningSnippets[reasoningSnippets.length - 1]}</p>
        </div>
      )}

      {toolCalls.length === 0 ? (
        <p className="text-xs text-slate-500">Reading the plan and consulting compliance standards…</p>
      ) : (
        <div className="space-y-2">
          {toolCalls.map((tc, i) => (
            <ToolCallDisplay key={i} toolCall={tc} idx={i} />
          ))}
        </div>
      )}
    </div>
  );
}