import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Plus, Loader2, RefreshCcw, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import PalladioGate from '@/components/PalladioGate';

export default function SavedChats() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: "architecture_assistant" });
      setConversations(convos || []);
      
      const searchParams = new URLSearchParams(window.location.search);
      const urlConvId = searchParams.get('convId');

      if (urlConvId && convos.find(c => c.id === urlConvId)) {
        selectConversation(urlConvId);
      } else if (convos.length > 0 && !activeConvId) {
        selectConversation(convos[0].id);
      } else if (convos.length === 0) {
        handleNewChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = async (id) => {
    setActiveConvId(id);
    const conv = await base44.agents.getConversation(id);
    setMessages(conv.messages || []);
  };

  useEffect(() => {
    if (!activeConvId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeConvId, (data) => {
      setMessages(data.messages || []);
      scrollToBottom();
    });
    return () => unsubscribe();
  }, [activeConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleNewChat = async () => {
    setIsLoading(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "architecture_assistant",
        metadata: { name: "New Discussion", description: "Architecture Assistant Chat" }
      });
      setActiveConvId(conv.id);
      setMessages(conv.messages || []);
      await loadConversations();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId) return;
    const text = input;
    setInput('');
    setIsLoading(true);
    
    try {
      const conv = await base44.agents.getConversation(activeConvId);
      if (messages.length <= 1 && typeof base44.agents.updateConversation === 'function') {
        try {
          await base44.agents.updateConversation(activeConvId, {
            metadata: { ...conv.metadata, name: text.substring(0, 30) + (text.length > 30 ? '...' : '') }
          });
          loadConversations();
        } catch (err) {
          console.warn('Could not update conversation name', err);
        }
      }
      await base44.agents.addMessage(conv, { role: "user", content: text });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PalladioGate>
      <div className="flex h-screen bg-[#0f1117] text-slate-200">
        
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-800 bg-[#0a0c10] flex flex-col hidden md:flex">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-400" />
              AI Assistant
            </h2>
            <Button onClick={handleNewChat} variant="ghost" size="icon" className="hover:bg-slate-800 text-slate-400">
              <Plus size={18} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 truncate",
                    activeConvId === c.id 
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                  )}
                >
                  {c.metadata?.name || "New Discussion"}
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-8">No chats yet</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[#0f1117]">
          {/* Mobile Header */}
          <div className="md:hidden p-4 border-b border-slate-800 flex justify-between items-center bg-[#0a0c10]">
            <h2 className="font-semibold text-white">AI Assistant</h2>
            <Button onClick={handleNewChat} variant="outline" size="sm" className="bg-slate-800 border-slate-700">
              <Plus size={16} className="mr-2" /> New
            </Button>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare size={48} className="mb-4 text-indigo-500" />
                <h3 className="text-xl font-medium text-white mb-2">How can I help?</h3>
                <p className="max-w-sm text-slate-400">Ask me about architecture, planning codes, or specific property details.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f1117] via-[#0f1117] to-transparent pt-12">
            <div className="max-w-3xl mx-auto">
              <form 
                onSubmit={handleSend}
                className="relative flex items-center bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about planning codes, structural ideas, or property info..."
                  className="flex-1 border-0 bg-transparent text-slate-200 placeholder:text-slate-500 h-14 px-5 focus-visible:ring-0 text-base"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={!input.trim() || isLoading || !activeConvId}
                  size="icon"
                  className="mr-2 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all shrink-0"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PalladioGate>
  );
}