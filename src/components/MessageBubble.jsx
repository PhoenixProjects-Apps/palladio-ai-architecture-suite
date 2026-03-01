import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-slate-800",
                    expanded ? "bg-slate-800 border-slate-700" : "bg-slate-900 border-slate-800"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-slate-200">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("text-slate-400", isError && "text-red-400")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 text-slate-500 transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-700 space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Parameters:</div>
                            <pre className="bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-300 whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Result:</div>
                            <pre className="bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mt-0.5 shrink-0 shadow-lg">
                    <span className="text-white font-bold text-xs">AI</span>
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-5 py-3 shadow-md",
                        isUser ? "bg-indigo-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-200"
                    )}>
                        {isUser ? (
                            <p className="text-[15px] leading-relaxed">{message.content}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-[15px] prose prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:leading-relaxed prose-headings:text-white"
                                components={{
                                    code: ({ inline, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group/code my-3">
                                                <pre className="bg-[#0f1117] text-slate-300 rounded-xl p-4 overflow-x-auto border border-slate-700/50">
                                                    <code className={className} {...props}>{children}</code>
                                                </pre>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                        toast.success('Code copied to clipboard');
                                                    }}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <code className="px-1.5 py-0.5 rounded-md bg-slate-900 text-indigo-300 text-sm font-medium">
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                
                {message.file_urls?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.file_urls.map((url, idx) => (
                            <img key={idx} src={url} alt="Attached" className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-700 object-cover" />
                        ))}
                    </div>
                )}

                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-2">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
            {isUser && (
                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center mt-0.5 shrink-0 shadow-sm border border-slate-600">
                    <span className="text-white font-medium text-xs">Me</span>
                </div>
            )}
        </div>
    );
}