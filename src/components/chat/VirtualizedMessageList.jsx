import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';

const ESTIMATED_MESSAGE_HEIGHT = 160;
const OVERSCAN = 8;
const VIRTUALIZE_AFTER = 50;

export default function VirtualizedMessageList({ messages, isAdmin, scrollRef }) {
  const [range, setRange] = useState({ start: 0, end: Math.min(messages.length, VIRTUALIZE_AFTER) });
  const shouldVirtualize = messages.length > VIRTUALIZE_AFTER;

  const updateRange = useCallback(() => {
    if (!shouldVirtualize || !scrollRef.current) {
      setRange({ start: 0, end: messages.length });
      return;
    }

    const { scrollTop, clientHeight } = scrollRef.current;
    const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_MESSAGE_HEIGHT) - OVERSCAN);
    const end = Math.min(
      messages.length,
      Math.ceil((scrollTop + clientHeight) / ESTIMATED_MESSAGE_HEIGHT) + OVERSCAN
    );
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [messages.length, scrollRef, shouldVirtualize]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateRange);
    return () => cancelAnimationFrame(frame);
  }, [updateRange]);

  const visibleMessages = useMemo(() => {
    if (!shouldVirtualize) return messages;
    return messages.slice(range.start, range.end);
  }, [messages, range.end, range.start, shouldVirtualize]);

  return (
    <div
      ref={scrollRef}
      onScroll={updateRange}
      className="flex-1 overflow-y-auto p-4 md:p-8 pb-32"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
          <MessageSquare size={48} className="mb-4 text-indigo-500" aria-hidden="true" />
          <h3 className="text-xl font-medium text-white mb-2">How can I help?</h3>
          <p className="max-w-sm text-slate-400">Ask me about architecture, planning codes, or specific property details.</p>
        </div>
      )}

      {shouldVirtualize && <div style={{ height: range.start * ESTIMATED_MESSAGE_HEIGHT }} aria-hidden="true" />}
      {visibleMessages.map((message, index) => (
        <div key={shouldVirtualize ? range.start + index : index} className="mb-6">
          <MessageBubble message={message} showToolCalls={isAdmin} />
        </div>
      ))}
      {shouldVirtualize && <div style={{ height: Math.max(0, messages.length - range.end) * ESTIMATED_MESSAGE_HEIGHT }} aria-hidden="true" />}
    </div>
  );
}